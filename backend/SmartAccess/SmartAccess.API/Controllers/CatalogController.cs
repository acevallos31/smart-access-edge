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
