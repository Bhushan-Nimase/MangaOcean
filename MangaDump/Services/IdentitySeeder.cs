using MangaDump.Models;
using Microsoft.AspNetCore.Identity;

namespace MangaDump.Services;

public static class IdentitySeeder
{
    /// <summary>Creates the Admin/User roles and, if configured, the first admin account.</summary>
    public static async Task SeedAsync(IServiceProvider services, IConfiguration config)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { AppRoles.Admin, AppRoles.User })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        var email = config["SeedAdmin:Email"];
        var password = config["SeedAdmin:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return;

        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        if (await userManager.FindByEmailAsync(email) is not null)
            return;

        var admin = new AppUser
        {
            UserName = config["SeedAdmin:UserName"] ?? "admin",
            Email = email,
            EmailConfirmed = true,
            DisplayName = "Admin"
        };

        var result = await userManager.CreateAsync(admin, password);
        if (!result.Succeeded)
            throw new InvalidOperationException(
                "Could not seed admin: " + string.Join("; ", result.Errors.Select(e => e.Description)));

        await userManager.AddToRoleAsync(admin, AppRoles.Admin);
    }
}
