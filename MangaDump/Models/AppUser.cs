using Microsoft.AspNetCore.Identity;

namespace MangaDump.Models;

public class AppUser : IdentityUser
{
    public string? DisplayName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<RefreshToken> RefreshTokens { get; set; } = [];
}

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string User = "User";
}
