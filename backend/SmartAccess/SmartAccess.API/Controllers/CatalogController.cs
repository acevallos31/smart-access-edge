using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
<<<<<<< HEAD
    [Route("api/[controller]")]
=======
    [Route("api/catalog")]
>>>>>>> 06a354e1dc03d62cdbf01ac9e6186183b1734ba6
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
<<<<<<< HEAD
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
=======
            var snapshot = await _firebaseService.GetCollection("CatalogRoles")
                .OrderBy("name")
                .GetSnapshotAsync();

            var items = snapshot.Documents.Select(ToItem).ToList();
            return Ok(items);
        }

        [HttpPost("roles")]
        public async Task<IActionResult> AddRole([FromBody] CatalogCreateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { message = "El nombre es requerido" });
            }

            var name = dto.Name.Trim();
            var existing = await _firebaseService.GetCollection("CatalogRoles")
                .WhereEqualTo("name", name)
                .Limit(1)
                .GetSnapshotAsync();

            if (existing.Count > 0)
            {
                return Conflict(new { message = "El rol ya existe" });
            }

            var doc = _firebaseService.GetCollection("CatalogRoles").Document();
            await doc.SetAsync(new Dictionary<string, object>
            {
                ["name"] = name,
                ["createdAt"] = Timestamp.GetCurrentTimestamp()
            });

            return Ok(new { id = doc.Id, name });
        }

        [HttpPut("roles/{id}")]
        public async Task<IActionResult> UpdateRole(string id, [FromBody] CatalogCreateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { message = "El nombre es requerido" });
            }

            var docRef = _firebaseService.GetCollection("CatalogRoles").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();
            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Rol no encontrado" });
            }

            var name = dto.Name.Trim();
            var duplicate = await _firebaseService.GetCollection("CatalogRoles")
                .WhereEqualTo("name", name)
                .Limit(1)
                .GetSnapshotAsync();

            if (duplicate.Count > 0 && duplicate.Documents[0].Id != id)
            {
                return Conflict(new { message = "El rol ya existe" });
            }

            await docRef.SetAsync(new Dictionary<string, object>
            {
                ["name"] = name,
                ["updatedAt"] = Timestamp.GetCurrentTimestamp()
            }, SetOptions.MergeAll);

            return Ok(new { id, name });
>>>>>>> 06a354e1dc03d62cdbf01ac9e6186183b1734ba6
        }

        [HttpDelete("roles/{id}")]
        public async Task<IActionResult> DeleteRole(string id)
        {
<<<<<<< HEAD
            await _firebaseService.GetCollection("Roles").Document(id).DeleteAsync();
            return NoContent();
=======
            var docRef = _firebaseService.GetCollection("CatalogRoles").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();
            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Rol no encontrado" });
            }

            await docRef.DeleteAsync();
            return Ok(new { id, message = "Rol eliminado" });
>>>>>>> 06a354e1dc03d62cdbf01ac9e6186183b1734ba6
        }

        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments()
        {
<<<<<<< HEAD
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
=======
            var snapshot = await _firebaseService.GetCollection("CatalogDepartments")
                .OrderBy("name")
                .GetSnapshotAsync();

            var items = snapshot.Documents.Select(ToItem).ToList();
            return Ok(items);
        }

        [HttpPost("departments")]
        public async Task<IActionResult> AddDepartment([FromBody] CatalogCreateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { message = "El nombre es requerido" });
            }

            var name = dto.Name.Trim();
            var existing = await _firebaseService.GetCollection("CatalogDepartments")
                .WhereEqualTo("name", name)
                .Limit(1)
                .GetSnapshotAsync();

            if (existing.Count > 0)
            {
                return Conflict(new { message = "El departamento ya existe" });
            }

            var doc = _firebaseService.GetCollection("CatalogDepartments").Document();
            await doc.SetAsync(new Dictionary<string, object>
            {
                ["name"] = name,
                ["createdAt"] = Timestamp.GetCurrentTimestamp()
            });

            return Ok(new { id = doc.Id, name });
        }

        [HttpPut("departments/{id}")]
        public async Task<IActionResult> UpdateDepartment(string id, [FromBody] CatalogCreateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { message = "El nombre es requerido" });
            }

            var docRef = _firebaseService.GetCollection("CatalogDepartments").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();
            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Departamento no encontrado" });
            }

            var name = dto.Name.Trim();
            var duplicate = await _firebaseService.GetCollection("CatalogDepartments")
                .WhereEqualTo("name", name)
                .Limit(1)
                .GetSnapshotAsync();

            if (duplicate.Count > 0 && duplicate.Documents[0].Id != id)
            {
                return Conflict(new { message = "El departamento ya existe" });
            }

            await docRef.SetAsync(new Dictionary<string, object>
            {
                ["name"] = name,
                ["updatedAt"] = Timestamp.GetCurrentTimestamp()
            }, SetOptions.MergeAll);

            return Ok(new { id, name });
>>>>>>> 06a354e1dc03d62cdbf01ac9e6186183b1734ba6
        }

        [HttpDelete("departments/{id}")]
        public async Task<IActionResult> DeleteDepartment(string id)
        {
<<<<<<< HEAD
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
=======
            var docRef = _firebaseService.GetCollection("CatalogDepartments").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();
            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Departamento no encontrado" });
            }

            await docRef.DeleteAsync();
            return Ok(new { id, message = "Departamento eliminado" });
        }

        private static Dictionary<string, object> ToItem(DocumentSnapshot doc)
        {
            var data = doc.ToDictionary();
            var name = data.TryGetValue("name", out var raw) ? raw?.ToString() ?? string.Empty : string.Empty;
            return new Dictionary<string, object>
            {
                ["id"] = doc.Id,
                ["name"] = name
            };
>>>>>>> 06a354e1dc03d62cdbf01ac9e6186183b1734ba6
        }

        public class CatalogCreateDto
        {
            public string Name { get; set; } = string.Empty;
        }
    }
}
