using MangaDump.Data;
using MangaDump.Dtos;
using MangaDump.Models;
using MangaDump.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaDump.Controllers.Api;

[ApiController]
public class ChaptersController(AppDbContext db, IFileStorage storage) : ControllerBase
{
    // GET api/manga/one-piece/chapters/12.5   -> everything the reader screen needs
    [HttpGet("api/manga/{slug}/chapters/{number:decimal}")]
    public async Task<ActionResult<ChapterReaderDto>> Read(string slug, decimal number, CancellationToken ct)
    {
        var chapter = await db.Chapters
            .AsNoTracking()
            .Where(c => c.Manga.Slug == slug && c.Number == number)
            .Select(c => new
            {
                c.Id,
                c.MangaId,
                MangaTitle = c.Manga.Title,
                MangaSlug = c.Manga.Slug,
                c.Number,
                c.Title,
                c.PublishedAt,
                Pages = c.Pages
                    .OrderBy(p => p.PageNumber)
                    .Select(p => new PageDto(p.Id, p.PageNumber, p.ImageUrl))
                    .ToList()
            })
            .FirstOrDefaultAsync(ct);

        if (chapter is null) return NotFound();

        var previous = await db.Chapters
            .Where(c => c.MangaId == chapter.MangaId && c.Number < number)
            .OrderByDescending(c => c.Number)
            .Select(c => (decimal?)c.Number)
            .FirstOrDefaultAsync(ct);

        var next = await db.Chapters
            .Where(c => c.MangaId == chapter.MangaId && c.Number > number)
            .OrderBy(c => c.Number)
            .Select(c => (decimal?)c.Number)
            .FirstOrDefaultAsync(ct);

        return new ChapterReaderDto(
            chapter.Id, chapter.MangaId, chapter.MangaTitle, chapter.MangaSlug,
            chapter.Number, chapter.Title, chapter.PublishedAt,
            chapter.Pages, previous, next);
    }

    // GET api/chapters/7
    [HttpGet("api/chapters/{id:int}")]
    public async Task<ActionResult<ChapterSummaryDto>> GetById(int id, CancellationToken ct)
    {
        var dto = await GetSummaryAsync(id, ct);
        if (dto is null) return NotFound();
        return dto;
    }

    // POST api/manga/5/chapters
    [Authorize(Roles = AppRoles.Admin)]
    [HttpPost("api/manga/{mangaId:int}/chapters")]
    public async Task<ActionResult<ChapterSummaryDto>> Create(int mangaId, ChapterRequest request, CancellationToken ct)
    {
        if (!await db.Mangas.AnyAsync(m => m.Id == mangaId, ct))
            return NotFound();

        if (await db.Chapters.AnyAsync(c => c.MangaId == mangaId && c.Number == request.Number, ct))
            return DuplicateChapter(request.Number);

        var chapter = new Chapter
        {
            MangaId = mangaId,
            Number = request.Number,
            Title = request.Title
        };

        db.Chapters.Add(chapter);
        await db.SaveChangesAsync(ct);
        await TouchMangaAsync(mangaId, ct);

        var dto = new ChapterSummaryDto(chapter.Id, chapter.Number, chapter.Title, chapter.PublishedAt, 0);
        return CreatedAtAction(nameof(GetById), new { id = chapter.Id }, dto);
    }

    // PUT api/chapters/7
    [Authorize(Roles = AppRoles.Admin)]
    [HttpPut("api/chapters/{id:int}")]
    public async Task<ActionResult<ChapterSummaryDto>> Update(int id, ChapterRequest request, CancellationToken ct)
    {
        var chapter = await db.Chapters.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (chapter is null) return NotFound();

        if (await db.Chapters.AnyAsync(c => c.MangaId == chapter.MangaId && c.Number == request.Number && c.Id != id, ct))
            return DuplicateChapter(request.Number);

        chapter.Number = request.Number;
        chapter.Title = request.Title;
        await db.SaveChangesAsync(ct);
        await TouchMangaAsync(chapter.MangaId, ct);

        var pageCount = await db.ChapterPages.CountAsync(p => p.ChapterId == id, ct);
        return new ChapterSummaryDto(chapter.Id, chapter.Number, chapter.Title, chapter.PublishedAt, pageCount);
    }

    // DELETE api/chapters/7
    [Authorize(Roles = AppRoles.Admin)]
    [HttpDelete("api/chapters/{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var mangaId = await db.Chapters
            .Where(c => c.Id == id)
            .Select(c => (int?)c.MangaId)
            .FirstOrDefaultAsync(ct);

        if (mangaId is null) return NotFound();

        var files = await db.ChapterPages
            .Where(p => p.ChapterId == id)
            .Select(p => p.ImageUrl)
            .ToListAsync(ct);

        // Pages are removed by the database (cascade)
        await db.Chapters.Where(c => c.Id == id).ExecuteDeleteAsync(ct);
        await TouchMangaAsync(mangaId.Value, ct);

        foreach (var url in files) storage.Delete(url);

        return NoContent();
    }

    // POST api/chapters/7/pages   (multipart/form-data, field name: files, can repeat)
    // Pages are numbered in the order the files are sent, continuing after the last existing page.
    [Authorize(Roles = AppRoles.Admin)]
    [HttpPost("api/chapters/{id:int}/pages")]
    [RequestSizeLimit(300_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 300_000_000)]
    public async Task<ActionResult<List<PageDto>>> UploadPages(
        int id, [FromForm] List<IFormFile> files, CancellationToken ct)
    {
        var mangaId = await db.Chapters
            .Where(c => c.Id == id)
            .Select(c => (int?)c.MangaId)
            .FirstOrDefaultAsync(ct);

        if (mangaId is null) return NotFound();

        if (files.Count == 0)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "No files were uploaded.");

        foreach (var file in files)
        {
            if (!storage.IsAllowedImage(file, out var error))
                return Problem(statusCode: StatusCodes.Status400BadRequest, title: error);
        }

        var nextNumber = (await db.ChapterPages
            .Where(p => p.ChapterId == id)
            .MaxAsync(p => (int?)p.PageNumber, ct) ?? 0) + 1;

        var savedUrls = new List<string>(files.Count);
        var newPages = new List<ChapterPage>(files.Count);

        try
        {
            foreach (var file in files)
            {
                var url = await storage.SaveAsync(file, $"pages/{id}", ct);
                savedUrls.Add(url);
                newPages.Add(new ChapterPage { ChapterId = id, PageNumber = nextNumber++, ImageUrl = url });
            }

            db.ChapterPages.AddRange(newPages);
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            // don't leave orphaned files behind if anything failed
            foreach (var url in savedUrls) storage.Delete(url);
            throw;
        }

        await TouchMangaAsync(mangaId.Value, ct);

        return newPages.Select(p => new PageDto(p.Id, p.PageNumber, p.ImageUrl)).ToList();
    }

    // DELETE api/pages/55
    [Authorize(Roles = AppRoles.Admin)]
    [HttpDelete("api/pages/{id:int}")]
    public async Task<IActionResult> DeletePage(int id, CancellationToken ct)
    {
        var url = await db.ChapterPages
            .Where(p => p.Id == id)
            .Select(p => p.ImageUrl)
            .FirstOrDefaultAsync(ct);

        if (url is null) return NotFound();

        await db.ChapterPages.Where(p => p.Id == id).ExecuteDeleteAsync(ct);
        storage.Delete(url);

        return NoContent();
    }

    // ---------- helpers ----------

    private Task<ChapterSummaryDto?> GetSummaryAsync(int id, CancellationToken ct) =>
        db.Chapters
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new ChapterSummaryDto(c.Id, c.Number, c.Title, c.PublishedAt, c.Pages.Count))
            .FirstOrDefaultAsync(ct);

    private ObjectResult DuplicateChapter(decimal number) =>
        Problem(statusCode: StatusCodes.Status409Conflict,
            title: $"Chapter {number} already exists for this manga.");

    private Task<int> TouchMangaAsync(int mangaId, CancellationToken ct) =>
        db.Mangas
            .Where(m => m.Id == mangaId)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.UpdatedAt, DateTime.UtcNow), ct);
}
