using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/catalog")]
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
        }

        [HttpDelete("roles/{id}")]
        public async Task<IActionResult> DeleteRole(string id)
        {
            var docRef = _firebaseService.GetCollection("CatalogRoles").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();
            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Rol no encontrado" });
            }

            await docRef.DeleteAsync();
            return Ok(new { id, message = "Rol eliminado" });
        }

        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments()
        {
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
        }

        [HttpDelete("departments/{id}")]
        public async Task<IActionResult> DeleteDepartment(string id)
        {
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
        }

        public class CatalogCreateDto
        {
            public string Name { get; set; } = string.Empty;
        }
    }
}
