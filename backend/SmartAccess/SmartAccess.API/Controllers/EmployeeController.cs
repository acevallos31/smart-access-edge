using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeController : ControllerBase
    {
        private readonly FirebaseService _firebaseService;

        public EmployeeController(FirebaseService firebaseService)
        {
            _firebaseService = firebaseService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateEmployee([FromBody] Dictionary<string, object> employeeData)
        {
            var id = Guid.NewGuid().ToString();

            employeeData["id"] = id;
            employeeData["createdAt"] = Timestamp.GetCurrentTimestamp();

            await _firebaseService
                .GetCollection("Employees")
                .Document(id)
                .SetAsync(employeeData);

            return Ok(new
            {
                message = "Empleado guardado en Firebase",
                id,
                data = employeeData
            });
        }
    }
}