using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using SmartAccess.API.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Servicios
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "SmartAccess API", Version = "v1" });

    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "JWT Bearer. Ejemplo: Bearer {token}",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    };

    options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, securityScheme);

    options.AddSecurityRequirement(document =>
    {
        var securityRequirement = new OpenApiSecurityRequirement();
        var schemeReference = new OpenApiSecuritySchemeReference(JwtBearerDefaults.AuthenticationScheme, document);
        securityRequirement.Add(schemeReference, new List<string>());
        return securityRequirement;
    });
});
builder.Services.AddOpenApi();

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SmartAccess.API";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SmartAccess.Client";
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SmartAccess.Dev.SuperSecretKey.ChangeMe.123456789";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "https://localhost:4200",
                "https://smart-access-edge.vercel.app"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Inyección de Dependencias
builder.Services.AddSingleton<FirebaseService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<EmployeeService>();
builder.Services.AddScoped<AttendanceService>();
builder.Services.AddScoped<ReportService>();
builder.Services.AddLogging();

var app = builder.Build();

// OpenAPI / Scalar / Swagger
app.MapOpenApi();
app.MapScalarApiReference();

app.UseSwagger();
app.UseSwaggerUI();

if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

app.UseCors("FrontendPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/", () => "Smart Access Edge API running");
app.MapGet("/healthz", () => Results.Ok("Healthy"));

app.Run();
