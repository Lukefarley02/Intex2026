using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Intex2026.Api.Models;

namespace Intex2026.Api.Data;

public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ----- Donor & Support -----
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();

    // ----- Case Management -----
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);  // Required — configures Identity tables

        // Configure table names, keys, and relationships
        modelBuilder.Entity<Supporter>().ToTable("supporters");
        modelBuilder.Entity<Donation>().ToTable("donations");
        modelBuilder.Entity<Donation>()
            .Property(d => d.Amount)
            .HasColumnType("decimal(12,2)");
        modelBuilder.Entity<Donation>()
            .Property(d => d.EstimatedValue)
            .HasColumnType("decimal(12,2)");
        modelBuilder.Entity<Safehouse>().ToTable("safehouses");
        modelBuilder.Entity<Resident>().ToTable("residents");
        modelBuilder.Entity<ProcessRecording>().ToTable("process_recordings");
        modelBuilder.Entity<HomeVisitation>().ToTable("home_visitations");

        // Resident -> Safehouse relationship
        modelBuilder.Entity<Resident>()
            .HasOne(r => r.Safehouse)
            .WithMany()
            .HasForeignKey(r => r.SafehouseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
