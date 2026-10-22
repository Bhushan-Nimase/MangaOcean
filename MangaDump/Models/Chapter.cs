namespace MangaDump.Models;

public class Chapter
{
    public int Id { get; set; }
    public int MangaId { get; set; }

    // decimal so side chapters like 10.5 are possible
    public decimal Number { get; set; }
    public string? Title { get; set; }
    public DateTime PublishedAt { get; set; } = DateTime.UtcNow;

    public Manga Manga { get; set; } = null!;
    public List<ChapterPage> Pages { get; set; } = [];
}
