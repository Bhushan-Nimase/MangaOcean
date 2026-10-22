namespace MangaDump.Models;

/// <summary>
/// Only a SHA-256 hash of the token is stored, so a database leak does not expose usable sessions.
/// </summary>
public class RefreshToken
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    public AppUser User { get; set; } = null!;
}
