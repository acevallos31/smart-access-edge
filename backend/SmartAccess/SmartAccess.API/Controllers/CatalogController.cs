using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CatalogController : ControllerBase
    {
        private readonly FirebaseService _firebaseService;

        public CatalogController(FirebaseService firebaseService)
        {
            _firebaseService = firebaseService;
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            var result = await GetCatalogAsync("Roles", new[]
            {
                "Administrador", "Jefe", "Subjefe", "Contador", "Asistente del Jefe", "Empleado"
            });
            return Ok(result);
        }

        [HttpPost("roles")]
        public async Task<IActionResult> CreateRole([FromBody] CatalogCreateDto payload)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.Name))
                return BadRequest(new { message = "Name es requerido" });

            var created = await CreateCatalogItemAsync("Roles", payload.Name.Trim());
            return Ok(created);
        }

        [HttpDelete("roles/{id}")]
        public async Task<IActionResult> DeleteRole(string id)
        {
            await _firebaseService.GetCollection("Roles").Document(id).DeleteAsync();
            return NoContent();
        }

        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments()
        {
            var result = await GetCatalogAsync("Departments", new[]
            {
                "Recursos Humanos", "Tecnología", "Contabilidad", "Ventas", "Marketing", "Operaciones", "Legal", "Gerencia"
            });
            return Ok(result);
        }

        [HttpPost("departments")]
        public async Task<IActionResult> CreateDepartment([FromBody] CatalogCreateDto payload)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.Name))
                return BadRequest(new { message = "Name es requerido" });

            var created = await CreateCatalogItemAsync("Departments", payload.Name.Trim());
            return Ok(created);
        }

        [HttpDelete("departments/{id}")]
        public async Task<IActionResult> DeleteDepartment(string id)
        {
            await _firebaseService.GetCollection("Departments").Document(id).DeleteAsync();
            return NoContent();
        }

        private async Task<List<Dictionary<string, object>>> GetCatalogAsync(string collectionName, string[] defaults)
        {
            var collection = _firebaseService.GetCollection(collectionName);
            var snapshot = await collection.OrderBy("name").GetSnapshotAsync();

            if (snapshot.Documents.Count == 0)
            {
                foreach (var item in defaults)
                {
                    await collection.Document().SetAsync(new Dictionary<string, object>
                    {
                        ["name"] = item,
                        ["createdAt"] = Timestamp.GetCurrentTimestamp(),
                        ["system"] = true
                    });
                }

                snapshot = await collection.OrderBy("name").GetSnapshotAsync();
            }

            return snapshot.Documents.Select(d =>
            {
                var data = d.ToDictionary();
                data["id"] = d.Id;
                return data;
            }).ToList();
        }

        private async Task<Dictionary<string, object>> CreateCatalogItemAsync(string collectionName, string name)
        {
            var docRef = _firebaseService.GetCollection(collectionName).Document();
            var data = new Dictionary<string, object>
            {
                ["name"] = name,
                ["createdAt"] = Timestamp.GetCurrentTimestamp(),
                ["system"] = false
            };

            await docRef.SetAsync(data);
            data["id"] = docRef.Id;
            return data;
        }

        public class CatalogCreateDto
        {
            public string Name { get; set; } = string.Empty;
        }
    }
}
