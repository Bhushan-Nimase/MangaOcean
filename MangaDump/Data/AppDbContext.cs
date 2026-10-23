using MangaDump.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MangaDump.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Manga> Mangas => Set<Manga>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<ChapterPage> ChapterPages => Set<ChapterPage>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<LibraryEntry> LibraryEntries => Set<LibraryEntry>();
    public DbSet<UserFilterSetting> FilterSettings => Set<UserFilterSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder); // Identity tables

        modelBuilder.Entity<AppUser>(e =>
        {
            e.Property(x => x.DisplayName).HasMaxLength(60);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => new { x.UserId, x.RevokedAt });

            e.HasOne(x => x.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LibraryEntry>(e =>
        {
            // one entry per user per manga
            e.HasIndex(x => new { x.UserId, x.MangaId }).IsUnique();
            e.HasIndex(x => new { x.UserId, x.IsFollowing });
            e.HasIndex(x => new { x.UserId, x.IsLiked });
            e.HasIndex(x => new { x.UserId, x.LastReadAt });
            e.Property(x => x.LastChapterNumber).HasPrecision(8, 2);

            e.HasOne(x => x.User)
                .WithMany(u => u.LibraryEntries)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Manga)
                .WithMany(m => m.LibraryEntries)
                .HasForeignKey(x => x.MangaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserFilterSetting>(e =>
        {
            e.HasKey(x => x.UserId);
            e.Property(x => x.Sort).HasMaxLength(20).IsRequired();
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.IncludedGenres).HasMaxLength(500);
            e.Property(x => x.ExcludedGenres).HasMaxLength(500);

            e.HasOne(x => x.User)
                .WithOne(u => u.FilterSetting)
                .HasForeignKey<UserFilterSetting>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Manga>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(300).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(320).IsRequired();
            e.Property(x => x.Description).HasMaxLength(5000);
            e.Property(x => x.Author).HasMaxLength(200);
            e.Property(x => x.Artist).HasMaxLength(200);
            e.Property(x => x.CoverImageUrl).HasMaxLength(500);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => x.Title);
            e.HasIndex(x => x.UpdatedAt);

            e.HasMany(x => x.Genres).WithMany(g => g.Mangas);
        });

        modelBuilder.Entity<Chapter>(e =>
        {
            e.Property(x => x.Number).HasPrecision(8, 2);
            e.Property(x => x.Title).HasMaxLength(300);

            e.HasIndex(x => new { x.MangaId, x.Number }).IsUnique();

            e.HasOne(x => x.Manga)
                .WithMany(m => m.Chapters)
                .HasForeignKey(x => x.MangaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChapterPage>(e =>
        {
            e.Property(x => x.ImageUrl).HasMaxLength(500).IsRequired();

            e.HasIndex(x => new { x.ChapterId, x.PageNumber }).IsUnique();

            e.HasOne(x => x.Chapter)
                .WithMany(c => c.Pages)
                .HasForeignKey(x => x.ChapterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Genre>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(120).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();

            e.HasData(
                new Genre { Id = 1, Name = "Action", Slug = "action" },
                new Genre { Id = 2, Name = "Adventure", Slug = "adventure" },
                new Genre { Id = 3, Name = "Comedy", Slug = "comedy" },
                new Genre { Id = 4, Name = "Drama", Slug = "drama" },
                new Genre { Id = 5, Name = "Fantasy", Slug = "fantasy" },
                new Genre { Id = 6, Name = "Horror", Slug = "horror" },
                new Genre { Id = 7, Name = "Mystery", Slug = "mystery" },
                new Genre { Id = 8, Name = "Romance", Slug = "romance" },
                new Genre { Id = 9, Name = "Sci-Fi", Slug = "sci-fi" },
                new Genre { Id = 10, Name = "Slice of Life", Slug = "slice-of-life" });
        });
    }
}
