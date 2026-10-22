using System.ComponentModel.DataAnnotations;

namespace MangaDump.Dtos;

public class RegisterRequest
{
    [Required, StringLength(32, MinimumLength = 3)]
    [RegularExpression(@"^[A-Za-z0-9_.-]+$", ErrorMessage = "Username may only contain letters, digits, '.', '_' and '-'.")]
    public string UserName { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 10)]
    public string Password { get; set; } = string.Empty;

    [StringLength(60)]
    public string? DisplayName { get; set; }
}

public class LoginRequest
{
    /// <summary>Username or email.</summary>
    [Required, StringLength(256)]
    public string Identifier { get; set; } = string.Empty;

    [Required, StringLength(128)]
    public string Password { get; set; } = string.Empty;
}

public record UserDto(string Id, string UserName, string Email, string? DisplayName, List<string> Roles);

public record AuthResponse(string AccessToken, DateTime ExpiresAt, UserDto User);
