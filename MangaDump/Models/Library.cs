namespace MangaDump.Models;

/// <summary>
/// One row per (user, manga). Holds follow/like state and where the user stopped reading.
/// Created the first time the user follows, likes or reads a manga.
/// </summary>
public class LibraryEntry
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int MangaId { get; set; }

    public bool IsFollowing { get; set; }
    public bool IsLiked { get; set; }

    // Reading position ("continue where I left")
    public decimal? LastChapterNumber { get; set; }
    public int? LastPageNumber { get; set; }
    public DateTime? LastReadAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
    public Manga Manga { get; set; } = null!;
}

/// <summary>A member's saved default filters for the Browse page (members only).</summary>
public class UserFilterSetting
{
    public string UserId { get; set; } = string.Empty;

    public string Sort { get; set; } = "updated";
    public MangaStatus? Status { get; set; }

    /// <summary>Comma-separated genre slugs the manga must have (all of them).</summary>
    public string IncludedGenres { get; set; } = string.Empty;

    /// <summary>Comma-separated genre slugs to hide.</summary>
    public string ExcludedGenres { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
}
