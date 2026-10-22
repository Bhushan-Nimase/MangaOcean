using System.Text;
using System.Threading.RateLimiting;
using MangaDump.Data;
using MangaDump.Models;
using MangaDump.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;

namespace MangaDump
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // API controllers (the React app is served as static files from wwwroot)
            builder.Services.AddControllers()
                .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

            // Consistent JSON error bodies for /api errors
            builder.Services.AddProblemDetails();

            // MySQL via EF Core (pooled contexts are cheaper per request).
            // Version is fixed so design-time tools (Add-Migration) work even when the server is off;
            // change it if you run a different MySQL/MariaDB version.
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            builder.Services.AddDbContextPool<AppDbContext>(options =>
                options.UseMySql(
                    connectionString,
                    new MySqlServerVersion(new Version(8, 0, 36)),
                    mysql => mysql.EnableRetryOnFailure()));

            builder.Services.AddScoped<IFileStorage, LocalFileStorage>();

            // ---------- Authentication & authorization ----------

            // JWT settings are validated at startup (e.g. Key must be 32+ characters)
            builder.Services.AddOptions<JwtOptions>()
                .Bind(builder.Configuration.GetSection("Jwt"))
                .ValidateDataAnnotations()
                .ValidateOnStart();
            builder.Services.AddSingleton<TokenService>();

            builder.Services
                .AddIdentityCore<AppUser>(o =>
                {
                    o.User.RequireUniqueEmail = true;

                    o.Password.RequiredLength = 10;
                    o.Password.RequireDigit = true;
                    o.Password.RequireLowercase = true;
                    o.Password.RequireUppercase = true;
                    o.Password.RequireNonAlphanumeric = false;

                    // 5 wrong passwords -> locked for 10 minutes
                    o.Lockout.AllowedForNewUsers = true;
                    o.Lockout.MaxFailedAccessAttempts = 5;
                    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
                })
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>();

            builder.Services
                .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer();

            builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
                .Configure<IOptions<JwtOptions>>((bearer, jwtOptions) =>
                {
                    var jwt = jwtOptions.Value;
                    bearer.MapInboundClaims = false; // keep "sub", "role", "name" as written in the token
                    bearer.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = jwt.Issuer,
                        ValidateAudience = true,
                        ValidAudience = jwt.Audience,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                        ClockSkew = TimeSpan.FromSeconds(30),
                        NameClaimType = "name",
                        RoleClaimType = "role"
                    };
                });

            builder.Services.AddAuthorization();

            // ---------- Rate limiting ----------

            static string ClientKey(HttpContext ctx) => ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            builder.Services.AddRateLimiter(o =>
            {
                o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                // Everything: 300 requests/minute per client
                o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
                    RateLimitPartition.GetFixedWindowLimiter(ClientKey(ctx), _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 300,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));

                // Login / register / refresh: 10 requests/minute per client (slows brute force)
                o.AddPolicy("auth", ctx =>
                    RateLimitPartition.GetFixedWindowLimiter(ClientKey(ctx), _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));
            });

            // OpenAPI document at /openapi/v1.json (Development only)
            builder.Services.AddOpenApi();

            // Allow the React frontend. Credentials are needed for the refresh-token cookie.
            var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
            builder.Services.AddCors(options =>
                options.AddPolicy("Frontend", policy =>
                    policy.WithOrigins(allowedOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials()));

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();

                // Apply pending EF migrations and seed roles + first admin in development.
                // In production, run migrations as part of deployment instead.
                using var scope = app.Services.CreateScope();
                await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
                await IdentitySeeder.SeedAsync(scope.ServiceProvider, app.Configuration);
            }
            else
            {
                // Unhandled exceptions become JSON problem details
                app.UseExceptionHandler();

                app.UseHsts();
            }

            // Baseline security headers on every response
            app.Use(async (ctx, next) =>
            {
                var headers = ctx.Response.Headers;
                headers["X-Content-Type-Options"] = "nosniff";
                headers["X-Frame-Options"] = "DENY";
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
                // The React build only needs same-origin scripts/styles/images/API calls
                headers["Content-Security-Policy"] =
                    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
                await next();
            });

            app.UseHttpsRedirection();

            // Serves the React build from wwwroot (/ -> index.html) plus images uploaded at runtime.
            app.UseDefaultFiles();
            app.UseStaticFiles(new StaticFileOptions
            {
                OnPrepareResponse = ctx =>
                {
                    var path = ctx.Context.Request.Path;
                    var headers = ctx.Context.Response.Headers;

                    if (path.StartsWithSegments("/uploads"))
                    {
                        // GUID file names never change, so they can be cached aggressively
                        headers.CacheControl = "public,max-age=2592000,immutable";
                        // uploads are images only: forbid anything else from running if one is opened directly
                        headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'";
                    }
                    else if (path.StartsWithSegments("/assets"))
                    {
                        // Vite puts a content hash in these file names
                        headers.CacheControl = "public,max-age=31536000,immutable";
                    }
                    else if (path.Value == "/index.html")
                    {
                        headers.CacheControl = "no-cache"; // always pick up a new build
                    }
                }
            });

            app.UseRouting();
            app.UseCors("Frontend");
            app.UseRateLimiter();
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            // React single-page app: any non-API, non-file URL (e.g. /manga/one-piece) gets index.html
            app.MapFallback(async ctx =>
            {
                var path = ctx.Request.Path;
                if (path.StartsWithSegments("/api") || path.StartsWithSegments("/uploads") || Path.HasExtension(path.Value))
                {
                    ctx.Response.StatusCode = StatusCodes.Status404NotFound;
                    return;
                }

                var index = app.Environment.WebRootFileProvider.GetFileInfo("index.html");
                if (!index.Exists)
                {
                    ctx.Response.StatusCode = StatusCodes.Status404NotFound;
                    await ctx.Response.WriteAsync("Frontend not built yet. Run 'npm run build' inside frontend or MangaDump-Web.");
                    return;
                }

                ctx.Response.ContentType = "text/html; charset=utf-8";
                ctx.Response.Headers.CacheControl = "no-cache";
                await ctx.Response.SendFileAsync(index);
            });

            await app.RunAsync();
        }
    }
}
