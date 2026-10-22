using System.ComponentModel.DataAnnotations;
using MangaDump.Models;

namespace MangaDump.Dtos;

// ---------- Responses ----------

public record PagedResult<T>(List<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}

public record GenreDto(int Id, string Name, string Slug);

public record MangaListItemDto(
    int Id,
    string Title,
    string Slug,
    string? CoverImageUrl,
    MangaStatus Status,
    List<string> Genres,
    int ChapterCount);

public record ChapterSummaryDto(
    int Id,
    decimal Number,
    string? Title,
    DateTime PublishedAt,
    int PageCount);

public record MangaDetailDto(
    int Id,
    string Title,
    string Slug,
    string? Description,
    string? Author,
    string? Artist,
    string? CoverImageUrl,
    MangaStatus Status,
    int? ReleaseYear,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<GenreDto> Genres,
    List<ChapterSummaryDto> Chapters,
    int LikeCount,
    int FollowerCount);

public record PageDto(int Id, int PageNumber, string ImageUrl);

public record ChapterReaderDto(
    int Id,
    int MangaId,
    string MangaTitle,
    string MangaSlug,
    decimal Number,
    string? Title,
    DateTime PublishedAt,
    List<PageDto> Pages,
    decimal? PreviousNumber,
    decimal? NextNumber);

// ---------- Requests ----------

public class MangaQuery
{
    public string? Search { get; set; }

    // --- Members only (login required) ---

    /// <summary>Comma-separated genre slugs. A manga must have all of them.</summary>
    public string? Genres { get; set; }

    /// <summary>Comma-separated genre slugs to hide.</summary>
    public string? ExcludeGenres { get; set; }

    public MangaStatus? Status { get; set; }

    /// <summary>updated (default) | newest | title | chapters | popular</summary>
    public string? Sort { get; set; }

    // --- Public ---
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class MangaRequest
{
    [Required, StringLength(300, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [StringLength(5000)]
    public string? Description { get; set; }

    [StringLength(200)]
    public string? Author { get; set; }

    [StringLength(200)]
    public string? Artist { get; set; }

    public MangaStatus Status { get; set; } = MangaStatus.Ongoing;

    [Range(1900, 2100)]
    public int? ReleaseYear { get; set; }

    public List<int> GenreIds { get; set; } = [];
}

public class ChapterRequest
{
    [Range(0, 99999)]
    public decimal Number { get; set; }

    [StringLength(300)]
    public string? Title { get; set; }
}

public class GenreRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
}
