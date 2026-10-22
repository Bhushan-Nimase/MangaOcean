using System.ComponentModel.DataAnnotations;

namespace MangaDump.Services;

public class JwtOptions
{
    [Required] public string Issuer { get; set; } = string.Empty;
    [Required] public string Audience { get; set; } = string.Empty;

    /// <summary>HMAC signing secret. Keep it out of source control (User Secrets / environment variable).</summary>
    [Required, MinLength(32)] public string Key { get; set; } = string.Empty;

    [Range(1, 120)] public int AccessTokenMinutes { get; set; } = 15;
    [Range(1, 90)] public int RefreshTokenDays { get; set; } = 14;
}
