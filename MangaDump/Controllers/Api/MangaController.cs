using System.Linq.Expressions;
using MangaDump.Data;
using MangaDump.Dtos;
using MangaDump.Helpers;
using MangaDump.Models;
using MangaDump.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaDump.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class MangaController(AppDbContext db, IFileStorage storage) : ControllerBase
{
    // GET api/manga?search=&page=1&pageSize=20                      (public)
    //     &genres=action,comedy&excludeGenres=horror&status=&sort=  (login required)
    [HttpGet]
    public async Task<ActionResult<PagedResult<MangaListItemDto>>> GetAll(
        [FromQuery] MangaQuery q, CancellationToken ct)
    {
        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, 100);

        var sort = FilterHelper.NormalizeSort(q.Sort);
        var include = FilterHelper.ParseSlugs(q.Genres);
        var exclude = FilterHelper.ParseSlugs(q.ExcludeGenres);

        // Search and paging are open to everyone; filters and sorting are a members-only feature
        var usesFilters = include.Count > 0 || exclude.Count > 0 || q.Status is not null || sort != FilterHelper.DefaultSort;
        if (usesFilters && User.Identity?.IsAuthenticated != true)
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Log in to use filters and sorting.");

        var query = db.Mangas.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            // escape LIKE wildcards typed by the user
            var term = q.Search.Trim()
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");
            var pattern = $"%{term}%";
            // MySQL's default collation is case-insensitive, so plain LIKE is enough
            query = query.Where(m => EF.Functions.Like(m.Title, pattern));
        }

        // must have ALL included genres
        foreach (var slug in include)
        {
            var s = slug;
            query = query.Where(m => m.Genres.Any(g => g.Slug == s));
        }

        if (exclude.Count > 0)
            query = query.Where(m => !m.Genres.Any(g => exclude.Contains(g.Slug)));

        if (q.Status is { } status)
            query = query.Where(m => m.Status == status);

        var total = await query.CountAsync(ct);

        IOrderedQueryable<Manga> ordered = sort switch
        {
            "newest" => query.OrderByDescending(m => m.CreatedAt),
            "title" => query.OrderBy(m => m.Title),
            "chapters" => query.OrderByDescending(m => m.Chapters.Count),
            "popular" => query.OrderByDescending(m => m.LibraryEntries.Count(e => e.IsFollowing)),
            _ => query.OrderByDescending(m => m.UpdatedAt)
        };

        var items = total == 0
            ? []
            : await ordered
                .ThenBy(m => m.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new MangaListItemDto(
                    m.Id,
                    m.Title,
                    m.Slug,
                    m.CoverImageUrl,
                    m.Status,
                    m.Genres.Select(g => g.Name).ToList(),
                    m.Chapters.Count))
                .ToListAsync(ct);

        return new PagedResult<MangaListItemDto>(items, page, pageSize, total);
    }

    // GET api/manga/one-piece
    [HttpGet("{slug}")]
    public async Task<ActionResult<MangaDetailDto>> GetBySlug(string slug, CancellationToken ct)
    {
        var dto = await GetDetailAsync(m => m.Slug == slug, ct);
        if (dto is null) return NotFound();
        return dto;
    }

    // POST api/manga
    [Authorize(Roles = AppRoles.Admin)]
    [HttpPost]
    public async Task<ActionResult<MangaDetailDto>> Create(MangaRequest request, CancellationToken ct)
    {
        var genres = await ResolveGenresAsync(request.GenreIds, ct);
        if (genres is null)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "One or more genre IDs do not exist.");

        var manga = new Manga
        {
            Title = request.Title.Trim(),
            Slug = await UniqueSlugAsync(request.Title, ct),
            Description = request.Description,
            Author = request.Author,
            Artist = request.Artist,
            Status = request.Status,
            ReleaseYear = request.ReleaseYear,
            Genres = genres
        };

        db.Mangas.Add(manga);
        await db.SaveChangesAsync(ct);

        var dto = await GetDetailAsync(m => m.Id == manga.Id, ct);
        return CreatedAtAction(nameof(GetBySlug), new { slug = manga.Slug }, dto);
    }

    // PUT api/manga/5   (slug stays the same so existing links keep working)
    [Authorize(Roles = AppRoles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<MangaDetailDto>> Update(int id, MangaRequest request, CancellationToken ct)
    {
        var manga = await db.Mangas.Include(m => m.Genres).FirstOrDefaultAsync(m => m.Id == id, ct);
        if (manga is null) return NotFound();

        var genres = await ResolveGenresAsync(request.GenreIds, ct);
        if (genres is null)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "One or more genre IDs do not exist.");

        manga.Title = request.Title.Trim();
        manga.Description = request.Description;
        manga.Author = request.Author;
        manga.Artist = request.Artist;
        manga.Status = request.Status;
        manga.ReleaseYear = request.ReleaseYear;
        manga.UpdatedAt = DateTime.UtcNow;

        manga.Genres.Clear();
        manga.Genres.AddRange(genres);

        await db.SaveChangesAsync(ct);

        var dto = await GetDetailAsync(m => m.Id == id, ct);
        if (dto is null) return NotFound();
        return dto;
    }

    // DELETE api/manga/5
    [Authorize(Roles = AppRoles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        // Only the columns we need: image URLs, not whole entity graphs
        var cover = await db.Mangas
            .Where(m => m.Id == id)
            .Select(m => new { m.CoverImageUrl })
            .FirstOrDefaultAsync(ct);

        if (cover is null) return NotFound();

        var files = await db.ChapterPages
            .Where(p => p.Chapter.MangaId == id)
            .Select(p => p.ImageUrl)
            .ToListAsync(ct);
        files.Add(cover.CoverImageUrl ?? string.Empty);

        // Chapters, pages and library entries are removed by the database (cascade) in one statement
        await db.Mangas.Where(m => m.Id == id).ExecuteDeleteAsync(ct);

        // remove files only after the DB delete succeeded
        foreach (var url in files) storage.Delete(url);

        return NoContent();
    }

    // POST api/manga/5/cover   (multipart/form-data, field name: file)
    [Authorize(Roles = AppRoles.Admin)]
    [HttpPost("{id:int}/cover")]
    public async Task<IActionResult> UploadCover(int id, IFormFile file, CancellationToken ct)
    {
        var manga = await db.Mangas.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (manga is null) return NotFound();

        if (!storage.IsAllowedImage(file, out var error))
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: error);

        var oldUrl = manga.CoverImageUrl;
        manga.CoverImageUrl = await storage.SaveAsync(file, "covers", ct);
        manga.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        storage.Delete(oldUrl);

        return Ok(new { coverImageUrl = manga.CoverImageUrl });
    }

    // ---------- helpers ----------

    private Task<MangaDetailDto?> GetDetailAsync(Expression<Func<Manga, bool>> predicate, CancellationToken ct) =>
        db.Mangas
            .AsNoTracking()
            .Where(predicate)
            .Select(m => new MangaDetailDto(
                m.Id,
                m.Title,
                m.Slug,
                m.Description,
                m.Author,
                m.Artist,
                m.CoverImageUrl,
                m.Status,
                m.ReleaseYear,
                m.CreatedAt,
                m.UpdatedAt,
                m.Genres.OrderBy(g => g.Name).Select(g => new GenreDto(g.Id, g.Name, g.Slug)).ToList(),
                m.Chapters.OrderBy(c => c.Number)
                    .Select(c => new ChapterSummaryDto(c.Id, c.Number, c.Title, c.PublishedAt, c.Pages.Count))
                    .ToList(),
                m.LibraryEntries.Count(e => e.IsLiked),
                m.LibraryEntries.Count(e => e.IsFollowing)))
            .FirstOrDefaultAsync(ct);

    /// <summary>Returns null when any requested genre id does not exist.</summary>
    private async Task<List<Genre>?> ResolveGenresAsync(List<int> ids, CancellationToken ct)
    {
        var distinct = ids.Distinct().ToList();
        if (distinct.Count == 0) return [];

        var genres = await db.Genres.Where(g => distinct.Contains(g.Id)).ToListAsync(ct);
        return genres.Count == distinct.Count ? genres : null;
    }

    /// <summary>One query to fetch taken slugs, then pick the first free suffix in memory.</summary>
    private async Task<string> UniqueSlugAsync(string title, CancellationToken ct)
    {
        var baseSlug = SlugHelper.Slugify(title, "manga");
        if (baseSlug.Length > 300) baseSlug = baseSlug[..300];

        var prefix = baseSlug + "-";
        var taken = await db.Mangas
            .Where(m => m.Slug == baseSlug || m.Slug.StartsWith(prefix))
            .Select(m => m.Slug)
            .ToListAsync(ct);

        if (!taken.Contains(baseSlug)) return baseSlug;

        var suffix = 2;
        while (taken.Contains($"{baseSlug}-{suffix}")) suffix++;
        return $"{baseSlug}-{suffix}";
    }
}
