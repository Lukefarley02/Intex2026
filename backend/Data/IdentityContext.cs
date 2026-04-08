using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Intex2026.Api.Data;

public class IdentityContext : IdentityDbContext<ApplicationUser, IdentityRole, string>
{
    public IdentityContext(DbContextOptions<IdentityContext> options)
        : base(options) { }
}
