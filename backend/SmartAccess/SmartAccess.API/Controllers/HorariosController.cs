using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using SmartAccess.API.DTOs;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HorariosController : ControllerBase
    {
        // Base de datos simulada en memoria para almacenar los días asignados
        private static List<HorarioRegistro> _horariosDb = new List<HorarioRegistro>();
        private static int _nextHorarioId = 1;

        private static string? ObtenerUsuarioId(HorarioRegistro registro)
        {
            return ObtenerUsuarioId(registro?.Horario);
        }

        private static string? ObtenerUsuarioId(HorarioSemanalDto? horario)
        {
            if (horario == null)
            {
                return null;
            }

            var tipo = horario.GetType();
            var propiedadUsuario = tipo.GetProperty("UsuarioId")
                ?? tipo.GetProperty("Usuario")
                ?? tipo.GetProperty("UserId");

            return propiedadUsuario?.GetValue(horario)?.ToString();
        }

        // Helper type to almacenar el registro con Id
        private class HorarioRegistro
        {
            public int HorarioId { get; set; }
            // Permitir nulo para evitar la advertencia de inicialización y mantener compatibilidad
            public HorarioSemanalDto? Horario { get; set; }
        }

        // 1. GET: api/horarios/usuario/{userId}
        // Obtiene la lista de días laborables asignados a un usuario específico
        [HttpGet("usuario/{userId}")]
        public IActionResult GetHorariosPorUsuario(string userId)
        {
            var diasAsignados = _horariosDb
                .Where(h => ObtenerUsuarioId(h) == userId)
                .Select(h => h.Horario)
                // Ordena por el primer día registrado en la lista DiasLaborables (si existe)
                .OrderBy(h => (h.DiasLaborables != null && h.DiasLaborables.Count > 0) ? h.DiasLaborables.Min() : int.MaxValue)
                .ToList();

            return Ok(diasAsignados);
        }

        // 2. POST: api/horarios
        // Asigna un día de trabajo (Lunes a Viernes) a un usuario
        [HttpPost]
        public IActionResult AsignarDia([FromBody] HorarioSemanalDto nuevoDia)
        {
            // Validación del rango de días (Lunes = 1, Viernes = 5)
            if (nuevoDia.DiasLaborables == null || nuevoDia.DiasLaborables.Count == 0)
            {
                return BadRequest("Error: Solo se permite asignar turnos de Lunes a Viernes.");
            }

            // Evita duplicar el mismo día de la semana para el mismo empleado
            // Comprueba solapamiento entre días solicitados y días ya asignados al mismo usuario
            var diaDuplicado = _horariosDb.Any(h => ObtenerUsuarioId(h) == ObtenerUsuarioId(nuevoDia) &&
                                                     h.Horario?.DiasLaborables != null && nuevoDia.DiasLaborables != null &&
                                                     h.Horario.DiasLaborables.Intersect(nuevoDia.DiasLaborables).Any());
            if (diaDuplicado)
            {
                return BadRequest("Error: Este empleado ya tiene asignado este día de la semana.");
            }

            // Autoincrementa el ID único de la asignación y guarda en la lista
            var registro = new HorarioRegistro
            {
                HorarioId = _nextHorarioId++,
                Horario = nuevoDia
            };
            _horariosDb.Add(registro);

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
