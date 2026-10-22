using System.Buffers.Text;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MangaDump.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace MangaDump.Services;

public class TokenService(IOptions<JwtOptions> options)
{
    private readonly JwtOptions _options = options.Value;

    public (string Token, DateTime ExpiresAt) CreateAccessToken(AppUser user, IEnumerable<string> roles)
    {
        var expires = DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new("sub", user.Id),
            new("name", user.UserName!),
            new("email", user.Email!),
            new("jti", Guid.NewGuid().ToString("N"))
        };
        claims.AddRange(roles.Select(r => new Claim("role", r)));

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expires,
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key)),
                SecurityAlgorithms.HmacSha256)
        };

        return (new JsonWebTokenHandler().CreateToken(descriptor), expires);
    }

    /// <summary>Random 512-bit token. Raw value goes to the client cookie, only the hash is stored.</summary>
    public static (string Raw, string Hash) NewRefreshToken()
    {
        var raw = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(64));
        return (raw, Hash(raw));
    }

    public static string Hash(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}
