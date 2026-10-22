namespace MangaDump.Services;

public class LocalFileStorage(IWebHostEnvironment env) : IFileStorage
{
    private const string UrlPrefix = "/uploads/";
    private const long MaxBytes = 20 * 1024 * 1024; // 20 MB per image

    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif" };

    private string UploadsRoot => Path.Combine(env.WebRootPath, "uploads");

    public bool IsAllowedImage(IFormFile file, out string? error)
    {
        if (file.Length == 0)
        {
            error = $"'{file.FileName}' is empty.";
            return false;
        }

        if (file.Length > MaxBytes)
        {
            error = $"'{file.FileName}' is larger than {MaxBytes / (1024 * 1024)} MB.";
            return false;
        }

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
        {
            error = $"'{file.FileName}' is not an allowed image type ({string.Join(", ", AllowedExtensions)}).";
            return false;
        }

        if (!HasImageSignature(file))
        {
            error = $"'{file.FileName}' is not a valid image file.";
            return false;
        }

        error = null;
        return true;
    }

    // Checks the real file header so a renamed .exe/.html can't be uploaded as .jpg
    private static bool HasImageSignature(IFormFile file)
    {
        Span<byte> h = stackalloc byte[12];
        using var stream = file.OpenReadStream();
        if (stream.ReadAtLeast(h, h.Length, throwOnEndOfStream: false) < h.Length)
            return false;

        var jpeg = h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF;
        var png = h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47;
        var gif = h[0] == (byte)'G' && h[1] == (byte)'I' && h[2] == (byte)'F' && h[3] == (byte)'8';
        var webp = h[0] == (byte)'R' && h[1] == (byte)'I' && h[2] == (byte)'F' && h[3] == (byte)'F'
                   && h[8] == (byte)'W' && h[9] == (byte)'E' && h[10] == (byte)'B' && h[11] == (byte)'P';
        var avif = h[4] == (byte)'f' && h[5] == (byte)'t' && h[6] == (byte)'y' && h[7] == (byte)'p';

        return jpeg || png || gif || webp || avif;
    }

    public async Task<string> SaveAsync(IFormFile file, string folder, CancellationToken ct = default)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{extension}";

        var directory = Path.Combine(UploadsRoot, folder);
        Directory.CreateDirectory(directory);

        await using var stream = File.Create(Path.Combine(directory, fileName));
        await file.CopyToAsync(stream, ct);

        return $"{UrlPrefix}{folder.Replace('\\', '/')}/{fileName}";
    }

    public void Delete(string? url)
    {
        if (string.IsNullOrWhiteSpace(url) || !url.StartsWith(UrlPrefix, StringComparison.Ordinal))
            return;

        var relative = url[UrlPrefix.Length..].Replace('/', Path.DirectorySeparatorChar);
        var root = Path.GetFullPath(UploadsRoot);
        var fullPath = Path.GetFullPath(Path.Combine(root, relative));

        // Never delete anything outside the uploads folder
        if (!fullPath.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            return;

        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }
}
