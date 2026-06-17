using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.DTOs;
using SmartAccess.API.Services;
using System.Text.Json;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EmployeeController : ControllerBase
    {
        private readonly FirebaseService _firebaseService;

        public EmployeeController(FirebaseService firebaseService)
        {
            _firebaseService = firebaseService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllEmployees()
        {
            var snapshot = await _firebaseService
                .GetCollection("Employees")
                .GetSnapshotAsync();

            var employees = snapshot.Documents.Select(doc =>
            {
                var data = doc.ToDictionary();
                data["id"] = doc.Id;
                return data;
            });

            return Ok(employees);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetEmployeeById(string id)
        {
            var snapshot = await _firebaseService
                .GetCollection("Employees")
                .Document(id)
                .GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Empleado no encontrado" });
            }

            var data = snapshot.ToDictionary();
            data["id"] = snapshot.Id;

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> CreateEmployee([FromBody] EmployeeDto employee)
        {
            var id = Guid.NewGuid().ToString();

            var employeeData = new Dictionary<string, object>
            {
                ["nombre"] = employee.Nombre,
                ["departamento"] = employee.Departamento,
                ["cargo"] = employee.Cargo,
                ["horarioAsignado"] = employee.HorarioAsignado,
                ["fotoReferenciaUrl"] = employee.FotoReferenciaUrl,
                ["activo"] = employee.Activo ?? true,
                ["id"] = id,
                ["createdAt"] = Timestamp.GetCurrentTimestamp()
            };

            var saveTask = _firebaseService
                .GetCollection("Employees")
                .Document(id)
                .SetAsync(employeeData);

            var completedTask = await Task.WhenAny(saveTask, Task.Delay(TimeSpan.FromSeconds(10)));

            if (completedTask != saveTask)
            {
                return StatusCode(504, new
                {
                    message = "Firebase no respondio despues de 10 segundos"
                });
            }

            await saveTask;

            return Ok(new
            {
                message = "Empleado guardado en Firebase",
                id,
                data = employeeData
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEmployee(string id, [FromBody] Dictionary<string, object> updatedData)
        {
            if (updatedData == null || updatedData.Count == 0)
            {
                return BadRequest(new { message = "Debe enviar al menos un campo para actualizar." });
            }

            var docRef = _firebaseService
                .GetCollection("Employees")
                .Document(id);

            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Empleado no encontrado" });
            }

            var normalizedData = updatedData.ToDictionary(
                kvp => kvp.Key,
                kvp => ConvertToFirestoreValue(kvp.Value));

            normalizedData["updatedAt"] = Timestamp.GetCurrentTimestamp();

            await docRef.SetAsync(normalizedData, SetOptions.MergeAll);

            return Ok(new
            {
                message = "Empleado actualizado",
                id,
                data = normalizedData
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmployee(string id)
        {
            var docRef = _firebaseService
                .GetCollection("Employees")
                .Document(id);

            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Empleado no encontrado" });
            }

            await docRef.UpdateAsync(new Dictionary<string, object>
            {
                { "activo", false },
                { "deactivatedAt", Timestamp.GetCurrentTimestamp() }
            });

            return Ok(new
            {
                message = "Empleado desactivado",
                id
            });
        }

        private static object? ConvertToFirestoreValue(object? value)
        {
            if (value is null)
            {
                return null;
            }

            if (value is JsonElement jsonElement)
            {
                return ConvertJsonElement(jsonElement);
            }

            return value;
        }

        private static object? ConvertJsonElement(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.Object => element.EnumerateObject()
                    .ToDictionary(p => p.Name, p => ConvertJsonElement(p.Value)),
                JsonValueKind.Array => element.EnumerateArray()
                    .Select(ConvertJsonElement)
                    .ToList(),
                JsonValueKind.String => element.GetString(),
                JsonValueKind.Number => element.TryGetInt64(out var l) ? l : element.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                _ => null
            };
        }
    }
}
