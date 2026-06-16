using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.DTOs;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HorariosController : ControllerBase
    {
        // Base de datos simulada en memoria para almacenar los días asignados
        private static List<HorarioSemanalDto> _horariosDb = new List<HorarioSemanalDto>();

        // 1. GET: api/horarios/usuario/{userId}
        // Obtiene la lista de días laborables asignados a un usuario específico
        [HttpGet("usuario/{userId}")]
        public IActionResult GetHorariosPorUsuario(string userId)
        {
            var diasAsignados = _horariosDb
                .Where(h => h.UserId == userId)
                .OrderBy(h => h.DiaSemana) // Ordena los días de Lunes (1) a Viernes (5)
                .ToList();

            return Ok(diasAsignados);
        }

        // 2. POST: api/horarios
        // Asigna un día de trabajo (Lunes a Viernes) a un usuario
        [HttpPost]
        public IActionResult AsignarDia([FromBody] Horario nuevoDia)
        {
            // Validación del rango de días (Lunes = 1, Viernes = 5)
            if (nuevoDia.DiaSemana < 1 || nuevoDia.DiaSemana > 5)
            {
                return BadRequest("Error: Solo se permite asignar turnos de Lunes a Viernes.");
            }

            // Evita duplicar el mismo día de la semana para el mismo empleado
            var diaDuplicado = _horariosDb.Any(h => h.UserId == nuevoDia.UserId && h.DiaSemana == nuevoDia.DiaSemana);
            if (diaDuplicado)
            {
                return BadRequest("Error: Este empleado ya tiene asignado este día de la semana.");
            }

            // Autoincrementa el ID único de la asignación y guarda en la lista
            nuevoDia.HorarioId = _horariosDb.Count + 1;
            _horariosDb.Add(nuevoDia);

            return Ok(nuevoDia);
        }

        // 3. DELETE: api/horarios/{id}
        // Quita la asignación de un día específico usando su HorarioId
        [HttpDelete("{id}")]
        public IActionResult EliminarDia(int id)
        {
            var registro = _horariosDb.FirstOrDefault(h => h.HorarioId == id);
            if (registro == null)
            {
                return NotFound("Error: El registro de turno no existe.");
            }

            _horariosDb.Remove(registro);
            return Ok(new { mensaje = "Día desasignado correctamente." });
        }
    }
}
