var builder = WebApplication.CreateBuilder(args);


// Servicios
builder.Services.AddControllers();

// Swagger (UI)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// OpenAPI nuevo
builder.Services.AddOpenApi();

<<<<<<< Updated upstream
=======
// CORS — permite peticiones desde el frontend Angular
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

>>>>>>> Stashed changes
var app = builder.Build();


// Middleware
if (app.Environment.IsDevelopment())
{
    // Swagger clásico
    app.UseSwagger();
    app.UseSwaggerUI();

    // OpenAPI nuevo (JSON)
    app.MapOpenApi();
}

app.UseHttpsRedirection();
<<<<<<< Updated upstream

=======
app.UseCors("FrontendPolicy");   // <-- CORS antes de Authorization
>>>>>>> Stashed changes
app.UseAuthorization();

app.MapControllers();

app.Run();
