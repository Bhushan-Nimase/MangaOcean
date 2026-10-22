namespace MangaDump.Models;

public enum MangaStatus
{
    Ongoing,
    Completed,
    Hiatus,
    Cancelled
}

public class Manga
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Author { get; set; }
    public string? Artist { get; set; }
    public string? CoverImageUrl { get; set; }
    public MangaStatus Status { get; set; } = MangaStatus.Ongoing;
    public int? ReleaseYear { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<Chapter> Chapters { get; set; } = [];
    public List<Genre> Genres { get; set; } = [];
    public List<LibraryEntry> LibraryEntries { get; set; } = [];
}
