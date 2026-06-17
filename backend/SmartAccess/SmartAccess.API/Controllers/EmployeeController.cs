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
        public async Task<IActionResult> GetAllEmployees([FromQuery] bool? soloActivos)
        {
            var query = _firebaseService.GetCollection("Employees");
            QuerySnapshot snapshot = soloActivos == true
                ? await query.WhereEqualTo("activo", true).GetSnapshotAsync()
                : await query.GetSnapshotAsync();

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

            var horarioEntrada = !string.IsNullOrWhiteSpace(employee.HorarioEntrada)
                ? employee.HorarioEntrada
                : "08:00";
            var horarioSalida = !string.IsNullOrWhiteSpace(employee.HorarioSalida)
                ? employee.HorarioSalida
                : "17:00";

            var employeeData = new Dictionary<string, object>
            {
                ["nombre"] = employee.Nombre,
                ["departamento"] = employee.Departamento,
                ["cargo"] = employee.Cargo,
                ["rol"] = string.IsNullOrWhiteSpace(employee.Rol) ? "Usuario" : employee.Rol,
                ["email"] = employee.Email,
                ["turnoId"] = employee.TurnoId,
                ["turnoNombre"] = employee.TurnoNombre,
                ["horarioAsignado"] = employee.HorarioAsignado,
                ["horarioEntrada"] = horarioEntrada,
                ["horarioSalida"] = horarioSalida,
                ["horario"] = new Dictionary<string, object>
                {
                    ["entrada"] = horarioEntrada,
                    ["salida"] = horarioSalida
                },
                ["fotoReferenciaUrl"] = employee.FotoReferenciaUrl,
                ["fotoUrl"] = !string.IsNullOrWhiteSpace(employee.FotoUrl) ? employee.FotoUrl : employee.FotoReferenciaUrl,
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

        [HttpPatch("{id}/deactivate")]
        public async Task<IActionResult> DeactivateEmployee(string id, [FromBody] Dictionary<string, object>? body)
        {
            var docRef = _firebaseService.GetCollection("Employees").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Empleado no encontrado" });
            }

            var updates = new Dictionary<string, object>
            {
                ["activo"] = false,
                ["deactivatedAt"] = Timestamp.GetCurrentTimestamp(),
                ["updatedAt"] = Timestamp.GetCurrentTimestamp()
            };

            if (body != null)
            {
                if (body.TryGetValue("razon", out var razon) && razon != null)
                {
                    updates["razonInactividad"] = razon.ToString() ?? string.Empty;
                }

                if (body.TryGetValue("nota", out var nota) && nota != null)
                {
                    updates["notaInactividad"] = nota.ToString() ?? string.Empty;
                }
            }

            await docRef.SetAsync(updates, SetOptions.MergeAll);
            return Ok(new { message = "Empleado desactivado", id, activo = false });
        }

        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> ActivateEmployee(string id)
        {
            var docRef = _firebaseService.GetCollection("Employees").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Empleado no encontrado" });
            }

            await docRef.SetAsync(new Dictionary<string, object>
            {
                ["activo"] = true,
                ["updatedAt"] = Timestamp.GetCurrentTimestamp(),
                ["reactivatedAt"] = Timestamp.GetCurrentTimestamp(),
                ["razonInactividad"] = string.Empty,
                ["notaInactividad"] = string.Empty
            }, SetOptions.MergeAll);

            return Ok(new { message = "Empleado activado", id, activo = true });
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
