using MangaDump.Data;
using MangaDump.Dtos;
using MangaDump.Helpers;
using MangaDump.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaDump.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class GenresController(AppDbContext db) : ControllerBase
{
    // GET api/genres
    [HttpGet]
    public async Task<ActionResult<List<GenreDto>>> GetAll(CancellationToken ct) =>
        await db.Genres
            .AsNoTracking()
            .OrderBy(g => g.Name)
            .Select(g => new GenreDto(g.Id, g.Name, g.Slug))
            .ToListAsync(ct);

    // POST api/genres
    [Authorize(Roles = AppRoles.Admin)]
    [HttpPost]
    public async Task<ActionResult<GenreDto>> Create(GenreRequest request, CancellationToken ct)
    {
        var name = request.Name.Trim();
        var slug = SlugHelper.Slugify(name, "genre");

        if (await db.Genres.AnyAsync(g => g.Slug == slug, ct))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: $"Genre '{name}' already exists.");

        var genre = new Genre { Name = name, Slug = slug };
        db.Genres.Add(genre);
        await db.SaveChangesAsync(ct);

        return Created($"/api/genres/{genre.Id}", new GenreDto(genre.Id, genre.Name, genre.Slug));
    }

    // DELETE api/genres/3
    [Authorize(Roles = AppRoles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var genre = await db.Genres.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (genre is null) return NotFound();

        db.Genres.Remove(genre);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
