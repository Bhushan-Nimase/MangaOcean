using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MangaDump.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Genres",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Slug = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Genres", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Mangas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Title = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Slug = table.Column<string>(type: "varchar(320)", maxLength: 320, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(5000)", maxLength: 5000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Author = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Artist = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CoverImageUrl = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ReleaseYear = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Mangas", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Chapters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    MangaId = table.Column<int>(type: "int", nullable: false),
                    Number = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    Title = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PublishedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Chapters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Chapters_Mangas_MangaId",
                        column: x => x.MangaId,
                        principalTable: "Mangas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "GenreManga",
                columns: table => new
                {
                    GenresId = table.Column<int>(type: "int", nullable: false),
                    MangasId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GenreManga", x => new { x.GenresId, x.MangasId });
                    table.ForeignKey(
                        name: "FK_GenreManga_Genres_GenresId",
                        column: x => x.GenresId,
                        principalTable: "Genres",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GenreManga_Mangas_MangasId",
                        column: x => x.MangasId,
                        principalTable: "Mangas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ChapterPages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ChapterId = table.Column<int>(type: "int", nullable: false),
                    PageNumber = table.Column<int>(type: "int", nullable: false),
                    ImageUrl = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChapterPages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChapterPages_Chapters_ChapterId",
                        column: x => x.ChapterId,
                        principalTable: "Chapters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "Genres",
                columns: new[] { "Id", "Name", "Slug" },
                values: new object[,]
                {
                    { 1, "Action", "action" },
                    { 2, "Adventure", "adventure" },
                    { 3, "Comedy", "comedy" },
                    { 4, "Drama", "drama" },
                    { 5, "Fantasy", "fantasy" },
                    { 6, "Horror", "horror" },
                    { 7, "Mystery", "mystery" },
                    { 8, "Romance", "romance" },
                    { 9, "Sci-Fi", "sci-fi" },
                    { 10, "Slice of Life", "slice-of-life" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChapterPages_ChapterId_PageNumber",
                table: "ChapterPages",
                columns: new[] { "ChapterId", "PageNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Chapters_MangaId_Number",
                table: "Chapters",
                columns: new[] { "MangaId", "Number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GenreManga_MangasId",
                table: "GenreManga",
                column: "MangasId");

            migrationBuilder.CreateIndex(
                name: "IX_Genres_Slug",
                table: "Genres",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Mangas_Slug",
                table: "Mangas",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Mangas_Title",
                table: "Mangas",
                column: "Title");

            migrationBuilder.CreateIndex(
                name: "IX_Mangas_UpdatedAt",
                table: "Mangas",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChapterPages");

            migrationBuilder.DropTable(
                name: "GenreManga");

            migrationBuilder.DropTable(
                name: "Chapters");

            migrationBuilder.DropTable(
                name: "Genres");

            migrationBuilder.DropTable(
                name: "Mangas");
        }
    }
}
