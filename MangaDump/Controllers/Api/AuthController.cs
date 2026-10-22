using MangaDump.Data;
using MangaDump.Dtos;
using MangaDump.Models;
using MangaDump.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MangaDump.Controllers.Api;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController(
    UserManager<AppUser> users,
    AppDbContext db,
    IOptions<JwtOptions> jwtOptions,
    TokenService tokens) : ControllerBase
{
    private const string RefreshCookie = "md_refresh";
    private readonly JwtOptions _jwt = jwtOptions.Value;

    // POST api/auth/register
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        var user = new AppUser
        {
            UserName = request.UserName.Trim(),
            Email = request.Email.Trim(),
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim()
        };

        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
                ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        // Public sign-up only ever gets the normal role. Admins are seeded or promoted manually.
        await users.AddToRoleAsync(user, AppRoles.User);

        return await IssueSessionAsync(user, ct);
    }

    // POST api/auth/login
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var identifier = request.Identifier.Trim();
        var user = identifier.Contains('@')
            ? await users.FindByEmailAsync(identifier)
            : await users.FindByNameAsync(identifier);

        // Same message for "no such user" and "wrong password" so accounts can't be enumerated
        if (user is null)
            return InvalidCredentials();

        if (await users.IsLockedOutAsync(user))
            return Problem(statusCode: StatusCodes.Status429TooManyRequests,
                title: "Too many failed attempts. Try again in a few minutes.");

        if (!await users.CheckPasswordAsync(user, request.Password))
        {
            await users.AccessFailedAsync(user); // counts toward lockout
            return InvalidCredentials();
        }

        await users.ResetAccessFailedCountAsync(user);
        return await IssueSessionAsync(user, ct);
    }

    // POST api/auth/refresh   (uses the HttpOnly cookie; rotates the refresh token)
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(CancellationToken ct)
    {
        if (!HasCsrfHeader()) return BadRequest();

        if (!Request.Cookies.TryGetValue(RefreshCookie, out var raw) || string.IsNullOrEmpty(raw))
            return Unauthorized();

        var hash = TokenService.Hash(raw);
        var stored = await db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null)
        {
            ClearRefreshCookie();
            return Unauthorized();
        }

        if (stored.RevokedAt is { } revokedAt)
        {
            // A rotated token was presented again well after rotation: treat it as stolen
            // and sign the user out everywhere. Within a few seconds it's just two tabs racing.
            if (DateTime.UtcNow - revokedAt > TimeSpan.FromSeconds(10))
            {
                await db.RefreshTokens
                    .Where(t => t.UserId == stored.UserId && t.RevokedAt == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow), ct);
                ClearRefreshCookie();
            }
            return Unauthorized();
        }

        if (stored.ExpiresAt <= DateTime.UtcNow || await users.IsLockedOutAsync(stored.User))
        {
            ClearRefreshCookie();
            return Unauthorized();
        }

        stored.RevokedAt = DateTime.UtcNow; // saved together with the new token below
        return await IssueSessionAsync(stored.User, ct);
    }

    // POST api/auth/logout
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (!HasCsrfHeader()) return BadRequest();

        if (Request.Cookies.TryGetValue(RefreshCookie, out var raw) && !string.IsNullOrEmpty(raw))
        {
            var hash = TokenService.Hash(raw);
            await db.RefreshTokens
                .Where(t => t.TokenHash == hash && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow), ct);
        }

        ClearRefreshCookie();
        return NoContent();
    }

    // GET api/auth/me
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var id = User.FindFirst("sub")?.Value;
        var user = id is null ? null : await users.FindByIdAsync(id);
        if (user is null) return Unauthorized();

        return await ToDtoAsync(user);
    }

    // ---------- helpers ----------

    private async Task<AuthResponse> IssueSessionAsync(AppUser user, CancellationToken ct)
    {
        var roles = await users.GetRolesAsync(user);
        var (accessToken, expiresAt) = tokens.CreateAccessToken(user, roles);

        var (raw, hash) = TokenService.NewRefreshToken();
        var refreshExpires = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays);

        db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = hash, ExpiresAt = refreshExpires });

        // Housekeeping: drop this user's long-dead tokens so the table doesn't grow forever
        var cutoff = DateTime.UtcNow.AddDays(-30);
        await db.RefreshTokens
            .Where(t => t.UserId == user.Id && (t.ExpiresAt < cutoff || t.RevokedAt < cutoff))
            .ExecuteDeleteAsync(ct);

        await db.SaveChangesAsync(ct);

        Response.Cookies.Append(RefreshCookie, raw, new CookieOptions
        {
            HttpOnly = true,                 // JavaScript can never read it (XSS-safe)
            Secure = true,                   // HTTPS only
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",              // only sent to auth endpoints
            Expires = refreshExpires,
            IsEssential = true
        });

        return new AuthResponse(accessToken, expiresAt, new UserDto(
            user.Id, user.UserName!, user.Email!, user.DisplayName, roles.ToList()));
    }

    private async Task<UserDto> ToDtoAsync(AppUser user) =>
        new(user.Id, user.UserName!, user.Email!, user.DisplayName, (await users.GetRolesAsync(user)).ToList());

    private void ClearRefreshCookie() =>
        Response.Cookies.Delete(RefreshCookie, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth"
        });

    // Cookie-based endpoints must be called by our own JS: a plain cross-site form post can't add this header
    private bool HasCsrfHeader() =>
        Request.Headers.TryGetValue("X-Requested-With", out var v) && v == "XMLHttpRequest";

    private ObjectResult InvalidCredentials() =>
        Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Invalid username/email or password.");
}
