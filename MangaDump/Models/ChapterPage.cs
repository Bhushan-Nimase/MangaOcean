namespace MangaDump.Models;

public class ChapterPage
{
    public int Id { get; set; }
    public int ChapterId { get; set; }
    public int PageNumber { get; set; }
    public string ImageUrl { get; set; } = string.Empty;

    public Chapter Chapter { get; set; } = null!;
}
