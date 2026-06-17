using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly AttendanceService _attendanceService;
        private readonly ILogger<AttendanceController> _logger;

        public AttendanceController(AttendanceService attendanceService, ILogger<AttendanceController> logger)
        {
            _attendanceService = attendanceService ?? throw new ArgumentNullException(nameof(attendanceService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// GET /api/attendance - Obtiene todos los registros de asistencia (filterable)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var registros = await _attendanceService.ObtenerTodosAsync();
                return Ok(registros);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo registros de asistencia");
                return StatusCode(500, new { message = "Error obteniendo registros" });
            }
        }

        /// <summary>
        /// GET /api/attendance/today - Obtiene registros del día actual
        /// </summary>
        [HttpGet("today")]
        public async Task<IActionResult> GetToday()
        {
            try
            {
                var registros = await _attendanceService.ObtenerDelDiaAsync();
                return Ok(registros);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo registros de hoy");
                return StatusCode(500, new { message = "Error obteniendo registros del día" });
            }
        }

        /// <summary>
        /// GET /api/attendance/user/{userId} - Obtiene registros de un usuario específico
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUser(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    return BadRequest(new { message = "UserId es requerido" });
                }

                var registros = await _attendanceService.ObtenerPorUsuarioAsync(userId);
                return Ok(registros);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo registros del usuario {UserId}", userId);
                return StatusCode(500, new { message = "Error obteniendo registros del usuario" });
            }
        }

        /// <summary>
        /// GET /api/attendance/{id} - Obtiene un registro específico
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(id))
                {
                    return BadRequest(new { message = "ID es requerido" });
                }

                var registro = await _attendanceService.ObtenerPorIdAsync(id);
                if (registro == null)
                {
                    return NotFound(new { message = "Registro no encontrado" });
                }

                return Ok(registro);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo registro {RecordId}", id);
                return StatusCode(500, new { message = "Error obteniendo registro" });
            }
        }

        /// <summary>
        /// POST /api/attendance/register - Registra un evento de asistencia
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> RegisterAttendance([FromBody] Dictionary<string, object> payload)
        {
            try
            {
                if (payload == null || !payload.ContainsKey("UserId"))
                {
                    return BadRequest(new { message = "UserId es requerido" });
                }

                var userId = payload["UserId"]?.ToString();
                if (string.IsNullOrWhiteSpace(userId))
                {
                    return BadRequest(new { message = "UserId inválido" });
                }

                // Obtener tipo de movimiento (entrada/salida)
                var eventType = payload.ContainsKey("EventType") ? payload["EventType"]?.ToString() : "entrada";

                var success = await _attendanceService.RegistrarAsistenciaAsync(userId, eventType);
                if (!success)
                {
                    return StatusCode(500, new { message = "Error registrando asistencia" });
                }

                return Ok(new
                {
                    success = true,
                    message = "Asistencia registrada correctamente",
                    eventType,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registrando asistencia");
                return StatusCode(500, new { message = "Error registrando asistencia" });
            }
        }

        /// <summary>
        /// POST /api/attendance/check - Verifica si el usuario ya registró hoy
        /// </summary>
        [HttpPost("check")]
        public async Task<IActionResult> CheckAlreadyRegistered([FromBody] Dictionary<string, object> payload)
        {
            try
            {
                if (payload == null || !payload.ContainsKey("UserId"))
                {
                    return BadRequest(new { message = "UserId es requerido" });
                }

                var userId = payload["UserId"]?.ToString();
                if (string.IsNullOrWhiteSpace(userId))
                {
                    return BadRequest(new { message = "UserId inválido" });
                }

                // Verificar si existe registro de hoy
                var yaRegistro = await _attendanceService.YaRegistroHoyAsync(userId);
                var ultimoRegistro = await _attendanceService.ObtenerUltimoRegistroAsync(userId);

                return Ok(new
                {
                    alreadyRegistered = yaRegistro,
                    lastRecord = ultimoRegistro
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verificando registro");
                return StatusCode(500, new { message = "Error verificando registro" });
            }
        }
    }
}
