using Microsoft.AspNetCore.Mvc;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // La ruta será: api/Employee
    public class EmployeeController : ControllerBase
    {
        // GET: api/Employee
        [HttpGet]
        public IActionResult GetAllEmployees()
        {
            return Ok(new { message = "Lista de empleados" });
        }

        // GET: api/Employee/{id}
        [HttpGet("{id}")]
        public IActionResult GetEmployeeById(int id)
        {
            return Ok(new { message = $"Detalles del empleado con ID: {id}" });
        }

        // POST: api/Employee
        [HttpPost]
        public IActionResult CreateEmployee([FromBody] object employeeData)
        {
            return Ok(new { message = "Empleado creado con éxito", data = employeeData });
        }

        // PUT: api/Employee/{id}
        [HttpPut("{id}")]
        public IActionResult UpdateEmployee(int id, [FromBody] object updatedData)
        {
            return Ok(new { message = $"Empleado {id} actualizado" });
        }

        // DELETE: api/Employee/{id}
        [HttpDelete("{id}")]
        public IActionResult DeleteEmployee(int id)
        {
            return Ok(new { message = $"Empleado {id} eliminado" });
        }
    }
}