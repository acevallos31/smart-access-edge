using Scalar.AspNetCore;
using SmartAccess.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Servicios
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddOpenApi();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "https://localhost:4200"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Inyección de Dependencias
builder.Services.AddSingleton<FirebaseService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddLogging();

var app = builder.Build();

// OpenAPI / Scalar / Swagger disponibles también en Render
app.MapOpenApi();
app.MapScalarApiReference();

app.UseSwagger();
app.UseSwaggerUI();

// En Render no usamos redirección HTTPS interna
if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

app.UseCors("FrontendPolicy");

app.UseAuthorization();

app.MapControllers();

app.MapGet("/", () => "Smart Access Edge API running");
app.MapGet("/healthz", () => Results.Ok("Healthy"));

app.Run();