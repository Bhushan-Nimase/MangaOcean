namespace MangaDump.Services;

public interface IFileStorage
{
    /// <summary>Checks extension and size. Returns false with a message if the file is not acceptable.</summary>
    bool IsAllowedImage(IFormFile file, out string? error);

    /// <summary>Saves the file under wwwroot/uploads/{folder} and returns its public URL (e.g. /uploads/covers/abc.jpg).</summary>
    Task<string> SaveAsync(IFormFile file, string folder, CancellationToken ct = default);

    /// <summary>Deletes a previously saved file by its public URL. Silently ignores unknown URLs.</summary>
    void Delete(string? url);
}
