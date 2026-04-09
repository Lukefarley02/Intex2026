using Microsoft.AspNetCore.Mvc.Filters;
using System.Text.RegularExpressions;

namespace Intex2026.Api.Filters;

/// <summary>
/// Action filter that sanitizes all string properties on incoming request
/// models before the controller action runs.
///
/// What it does:
///   1. Trims leading/trailing whitespace from every string value.
///   2. Strips HTML tags (e.g. &lt;script&gt;, &lt;img onerror=...&gt;) to
///      prevent stored XSS if any value ever reaches a view or API response
///      that renders HTML.
///
/// What it does NOT do:
///   - It does not validate business rules — that stays in controllers/services.
///   - It does not touch non-string types (ints, bools, DateTimes, etc.).
///   - It does not encode for HTML output; that is the UI's responsibility.
/// </summary>
public sealed class SanitizeInputFilter : IActionFilter
{
    // Matches any HTML tag: <anything> or </anything>.
    private static readonly Regex HtmlTagPattern =
        new(@"<[^>]*>", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public void OnActionExecuting(ActionExecutingContext context)
    {
        foreach (var key in context.ActionArguments.Keys.ToList())
        {
            var value = context.ActionArguments[key];
            if (value is null) continue;

            context.ActionArguments[key] = SanitizeObject(value);
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { /* no-op */ }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private static object? SanitizeObject(object? obj)
    {
        if (obj is null) return null;

        // Plain string argument (e.g. a [FromQuery] string parameter).
        if (obj is string str)
            return SanitizeString(str);

        // Walk all writable string properties of complex objects (DTOs, models).
        var type = obj.GetType();

        // Skip primitives, enums, value types, and framework types.
        if (type.IsPrimitive || type.IsEnum || type.IsValueType || type.Namespace?.StartsWith("System") == true)
            return obj;

        foreach (var prop in type.GetProperties())
        {
            if (!prop.CanRead || !prop.CanWrite) continue;
            if (prop.PropertyType != typeof(string)) continue;

            var original = (string?)prop.GetValue(obj);
            if (original is null) continue;

            var sanitized = SanitizeString(original);
            if (!ReferenceEquals(original, sanitized))
                prop.SetValue(obj, sanitized);
        }

        return obj;
    }

    private static string SanitizeString(string value)
    {
        // 1. Trim whitespace.
        var trimmed = value.Trim();

        // 2. Strip HTML tags.
        var stripped = HtmlTagPattern.Replace(trimmed, string.Empty);

        return stripped;
    }
}
