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


// Middleware

if (app.Environment.IsDevelopment())
{
    // OpenAPI JSON
    app.MapOpenApi();

    // Scalar UI
    app.MapScalarApiReference();

    // Swagger UI
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// CORS antes de Authorization
app.UseCors("FrontendPolicy");

app.UseAuthorization();

app.MapControllers();

app.Run();
