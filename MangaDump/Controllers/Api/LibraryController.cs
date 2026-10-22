using MangaDump.Data;
using MangaDump.Dtos;
using MangaDump.Helpers;
using MangaDump.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaDump.Controllers.Api;

/// <summary>Everything here is per-user, so the whole controller requires a login.</summary>
[ApiController]
[Authorize]
[Route("api/library")]
public class LibraryController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirst("sub")!.Value;

    // GET api/library?tab=following|liked|history&page=1&pageSize=24
    [HttpGet]
    public async Task<ActionResult<PagedResult<LibraryItemDto>>> GetList(
        [FromQuery] string tab = "following", [FromQuery] int page = 1, [FromQuery] int pageSize = 24,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var uid = UserId;

        var entries = db.LibraryEntries.AsNoTracking().Where(e => e.UserId == uid);

        IOrderedQueryable<LibraryEntry> ordered;
        switch (tab.ToLowerInvariant())
        {
            case "liked":
                entries = entries.Where(e => e.IsLiked);
                ordered = entries.OrderByDescending(e => e.UpdatedAt);
                break;
            case "history":
                entries = entries.Where(e => e.LastReadAt != null);
                ordered = entries.OrderByDescending(e => e.LastReadAt);
                break;
            default: // following: most recently read first, never-read ones by when they were followed
                entries = entries.Where(e => e.IsFollowing);
                ordered = entries.OrderByDescending(e => e.LastReadAt ?? e.UpdatedAt);
                break;
        }

        var total = await entries.CountAsync(ct);
        var items = total == 0
            ? []
            : await ToItems(ordered.ThenBy(e => e.Id).Skip((page - 1) * pageSize).Take(pageSize)).ToListAsync(ct);

        return new PagedResult<LibraryItemDto>(items, page, pageSize, total);
    }

    // GET api/library/status/12   (follow/like state + resume position for one manga)
    [HttpGet("status/{mangaId:int}")]
    public async Task<ActionResult<LibraryStatusDto>> Status(int mangaId, CancellationToken ct)
    {
        var uid = UserId;
        var item = await ToItems(db.LibraryEntries.AsNoTracking().Where(e => e.UserId == uid && e.MangaId == mangaId))
            .FirstOrDefaultAsync(ct);

        return item is null
            ? new LibraryStatusDto(false, false, null, null, null, null)
            : ToStatus(item);
    }

    // PUT api/library/12/follow   { "value": true }
    [HttpPut("{mangaId:int}/follow")]
    public async Task<ActionResult<LibraryStatusDto>> Follow(int mangaId, ToggleRequest request, CancellationToken ct)
    {
        var entry = await UpsertAsync(mangaId, e => e.IsFollowing = request.Value, ct);
        if (entry is null) return NotFound();
        return await Status(mangaId, ct);
    }

    // PUT api/library/12/like   { "value": true }
    [HttpPut("{mangaId:int}/like")]
    public async Task<ActionResult<LibraryStatusDto>> Like(int mangaId, ToggleRequest request, CancellationToken ct)
    {
        var entry = await UpsertAsync(mangaId, e => e.IsLiked = request.Value, ct);
        if (entry is null) return NotFound();
        return await Status(mangaId, ct);
    }

    // PUT api/library/12/progress   { "chapterNumber": 5, "pageNumber": 7 }
    [HttpPut("{mangaId:int}/progress")]
    public async Task<IActionResult> Progress(int mangaId, ProgressRequest request, CancellationToken ct)
    {
        if (!await db.Chapters.AnyAsync(c => c.MangaId == mangaId && c.Number == request.ChapterNumber, ct))
            return NotFound();

        var entry = await UpsertAsync(mangaId, e =>
        {
            e.LastChapterNumber = request.ChapterNumber;
            e.LastPageNumber = request.PageNumber;
            e.LastReadAt = DateTime.UtcNow;
        }, ct);

        if (entry is null) return NotFound();
        return NoContent();
    }

    // GET api/library/filters
    [HttpGet("filters")]
    public async Task<ActionResult<FilterSettingsDto>> GetFilters(CancellationToken ct)
    {
        var uid = UserId;
        var saved = await db.FilterSettings.AsNoTracking().FirstOrDefaultAsync(f => f.UserId == uid, ct);

        return saved is null
            ? new FilterSettingsDto()
            : new FilterSettingsDto
            {
                Sort = FilterHelper.NormalizeSort(saved.Sort),
                Status = saved.Status,
                IncludeGenres = FilterHelper.ParseSlugs(saved.IncludedGenres),
                ExcludeGenres = FilterHelper.ParseSlugs(saved.ExcludedGenres)
            };
    }

    // PUT api/library/filters
    [HttpPut("filters")]
    public async Task<ActionResult<FilterSettingsDto>> SaveFilters(FilterSettingsDto request, CancellationToken ct)
    {
        var uid = UserId;
        var include = FilterHelper.CleanSlugs(request.IncludeGenres);
        var exclude = FilterHelper.CleanSlugs(request.ExcludeGenres).Except(include).ToList(); // include wins
        var sort = FilterHelper.NormalizeSort(request.Sort);

        var saved = await db.FilterSettings.FirstOrDefaultAsync(f => f.UserId == uid, ct);
        if (saved is null)
        {
            saved = new UserFilterSetting { UserId = uid };
            db.FilterSettings.Add(saved);
        }

        saved.Sort = sort;
        saved.Status = request.Status;
        saved.IncludedGenres = string.Join(',', include);
        saved.ExcludedGenres = string.Join(',', exclude);
        saved.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return new FilterSettingsDto { Sort = sort, Status = request.Status, IncludeGenres = include, ExcludeGenres = exclude };
    }

    // ---------- helpers ----------

    /// <summary>
    /// Finds (or creates) the user's entry for a manga, applies a change and saves.
    /// If two requests race to create the same entry, the second one retries and updates it.
    /// Returns null when the manga doesn't exist.
    /// </summary>
    private async Task<LibraryEntry?> UpsertAsync(int mangaId, Action<LibraryEntry> apply, CancellationToken ct)
    {
        var uid = UserId;

        for (var attempt = 0; ; attempt++)
        {
            var entry = await db.LibraryEntries.FirstOrDefaultAsync(e => e.UserId == uid && e.MangaId == mangaId, ct);
            if (entry is null)
            {
                if (!await db.Mangas.AnyAsync(m => m.Id == mangaId, ct)) return null;
                entry = new LibraryEntry { UserId = uid, MangaId = mangaId };
                db.LibraryEntries.Add(entry);
            }

            apply(entry);
            entry.UpdatedAt = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync(ct);
                return entry;
            }
            catch (DbUpdateException) when (attempt == 0)
            {
                db.ChangeTracker.Clear(); // lost the race: reload the row the other request created
            }
        }
    }

    private static LibraryStatusDto ToStatus(LibraryItemDto i) =>
        new(i.IsFollowing, i.IsLiked, i.LastChapterNumber, i.LastPageNumber, i.LastChapterPageCount, i.NextChapterNumber);

    private static IQueryable<LibraryItemDto> ToItems(IQueryable<LibraryEntry> entries) =>
        entries.Select(e => new LibraryItemDto(
            e.MangaId,
            e.Manga.Title,
            e.Manga.Slug,
            e.Manga.CoverImageUrl,
            e.Manga.Status,
            e.IsFollowing,
            e.IsLiked,
            e.LastChapterNumber,
            e.LastPageNumber,
            // pages in the chapter the user was reading (to detect "finished this chapter")
            e.Manga.Chapters
                .Where(c => c.Number == e.LastChapterNumber)
                .Select(c => (int?)c.Pages.Count)
                .FirstOrDefault(),
            // the chapter after the one they were reading
            e.Manga.Chapters
                .Where(c => e.LastChapterNumber != null && c.Number > e.LastChapterNumber)
                .OrderBy(c => c.Number)
                .Select(c => (decimal?)c.Number)
                .FirstOrDefault(),
            e.Manga.Chapters.Min(c => (decimal?)c.Number),
            // chapters they haven't read yet (all of them if they never started)
            e.Manga.Chapters.Count(c => e.LastChapterNumber == null || c.Number > e.LastChapterNumber),
            e.LastReadAt));
}
