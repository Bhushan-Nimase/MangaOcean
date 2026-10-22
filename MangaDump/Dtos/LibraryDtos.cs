using System.ComponentModel.DataAnnotations;
using MangaDump.Models;

namespace MangaDump.Dtos;

/// <summary>Everything the app needs to show a manga in the user's library and to resume reading.</summary>
public record LibraryItemDto(
    int MangaId,
    string Title,
    string Slug,
    string? CoverImageUrl,
    MangaStatus Status,
    bool IsFollowing,
    bool IsLiked,
    decimal? LastChapterNumber,
    int? LastPageNumber,
    int? LastChapterPageCount,
    decimal? NextChapterNumber,
    decimal? FirstChapterNumber,
    int UnreadCount,
    DateTime? LastReadAt);

/// <summary>The current user's state for a single manga (detail page buttons).</summary>
public record LibraryStatusDto(
    bool IsFollowing,
    bool IsLiked,
    decimal? LastChapterNumber,
    int? LastPageNumber,
    int? LastChapterPageCount,
    decimal? NextChapterNumber);

public class ToggleRequest
{
    public bool Value { get; set; }
}

public class ProgressRequest
{
    [Range(0, 99999)]
    public decimal ChapterNumber { get; set; }

    [Range(1, 10000)]
    public int PageNumber { get; set; } = 1;
}

/// <summary>Used both as the saved-filters response and request body.</summary>
public class FilterSettingsDto
{
    public string Sort { get; set; } = "updated";
    public MangaStatus? Status { get; set; }
    public List<string> IncludeGenres { get; set; } = [];
    public List<string> ExcludeGenres { get; set; } = [];
}
