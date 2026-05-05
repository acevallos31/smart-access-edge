var builder = WebApplication.CreateBuilder(args);


// Servicios
builder.Services.AddControllers();

// Swagger (UI)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// OpenAPI nuevo
builder.Services.AddOpenApi();

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

app.UseAuthorization();

app.MapControllers();

app.Run();