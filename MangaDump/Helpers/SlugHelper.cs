using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace MangaDump.Helpers;

public static partial class SlugHelper
{
    public static string Slugify(string text, string fallback = "item")
    {
        var decomposed = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);

        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }

        var slug = NonAlphanumeric().Replace(sb.ToString().ToLowerInvariant(), "-").Trim('-');

        // Titles written fully in non-latin script (e.g. Japanese) end up empty
        return slug.Length == 0 ? fallback : slug;
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonAlphanumeric();
}
