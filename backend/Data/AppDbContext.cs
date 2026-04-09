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
    public DbSet<CaseConference> CaseConferences => Set<CaseConference>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();

    // ----- Partners -----
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();

    // ----- In-Kind Donations -----
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();

    // ----- Messaging -----
    public DbSet<DonorMessage> DonorMessages => Set<DonorMessage>();

    // ----- Auth -----
    public DbSet<PasswordResetRequest> PasswordResetRequests => Set<PasswordResetRequest>();

    // ----- Analytics -----
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();

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
        modelBuilder.Entity<CaseConference>().ToTable("case_conferences");
        modelBuilder.Entity<InterventionPlan>().ToTable("intervention_plans");
        modelBuilder.Entity<InterventionPlan>()
            .Property(p => p.TargetValue)
            .HasColumnType("decimal(10,2)");
        modelBuilder.Entity<Partner>().ToTable("partners");
        modelBuilder.Entity<PartnerAssignment>().ToTable("partner_assignments");
        modelBuilder.Entity<InKindDonationItem>().ToTable("in_kind_donation_items");
        modelBuilder.Entity<InKindDonationItem>()
            .Property(i => i.EstimatedUnitValue)
            .HasColumnType("decimal(10,2)");
        modelBuilder.Entity<DonorMessage>().ToTable("donor_messages");
        modelBuilder.Entity<PasswordResetRequest>().ToTable("password_reset_requests");
        modelBuilder.Entity<SocialMediaPost>().ToTable("social_media_posts");
        modelBuilder.Entity<SocialMediaPost>()
            .Property(p => p.EstimatedDonationValuePhp)
            .HasColumnType("decimal(12,2)");
        modelBuilder.Entity<SocialMediaPost>()
            .Property(p => p.EngagementRate)
            .HasColumnType("decimal(8,6)");

        // Resident -> Safehouse relationship
        modelBuilder.Entity<Resident>()
            .HasOne(r => r.Safehouse)
            .WithMany()
            .HasForeignKey(r => r.SafehouseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
