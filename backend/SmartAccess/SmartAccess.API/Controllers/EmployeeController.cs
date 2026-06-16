using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.DTOs;
using SmartAccess.API.Services;

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
            var docRef = _firebaseService
                .GetCollection("Employees")
                .Document(id);

            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Empleado no encontrado" });
            }

            updatedData["updatedAt"] = Timestamp.GetCurrentTimestamp();

            await docRef.SetAsync(updatedData, SetOptions.MergeAll);

            return Ok(new
            {
                message = "Empleado actualizado",
                id,
                data = updatedData
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
    }
}
