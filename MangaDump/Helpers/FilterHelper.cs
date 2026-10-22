using System.Text.RegularExpressions;

namespace MangaDump.Helpers;

public static partial class FilterHelper
{
    public const string DefaultSort = "updated";

    /// <summary>updated = recently updated, newest = recently added, popular = most followed.</summary>
    public static readonly string[] Sorts = ["updated", "newest", "title", "chapters", "popular"];

    public static string NormalizeSort(string? sort)
    {
        var value = (sort ?? string.Empty).Trim().ToLowerInvariant();
        return Sorts.Contains(value) ? value : DefaultSort;
    }

    /// <summary>"action, comedy" -> ["action","comedy"] (invalid slugs dropped, max 20).</summary>
    public static List<string> ParseSlugs(string? csv) =>
        CleanSlugs(csv?.Split(','));

    public static List<string> CleanSlugs(IEnumerable<string>? items) =>
        (items ?? [])
            .Select(s => s.Trim().ToLowerInvariant())
            .Where(s => s.Length is > 0 and <= 120 && SlugPattern().IsMatch(s))
            .Distinct()
            .Take(20)
            .ToList();

    [GeneratedRegex("^[a-z0-9-]+$")]
    private static partial Regex SlugPattern();
}
