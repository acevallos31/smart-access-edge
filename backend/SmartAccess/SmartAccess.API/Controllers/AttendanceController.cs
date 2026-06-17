using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.DTOs;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly AttendanceService _attendanceService;
        private readonly PhotoService _photoService;
        private readonly FaceVerificationService _faceVerificationService;
        private readonly ILogger<AttendanceController> _logger;

        public AttendanceController(
            AttendanceService attendanceService,
            PhotoService photoService,
            FaceVerificationService faceVerificationService,
            ILogger<AttendanceController> logger)
        {
            _attendanceService = attendanceService ?? throw new ArgumentNullException(nameof(attendanceService));
            _photoService = photoService ?? throw new ArgumentNullException(nameof(photoService));
            _faceVerificationService = faceVerificationService ?? throw new ArgumentNullException(nameof(faceVerificationService));
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
        public async Task<IActionResult> RegisterAttendance([FromBody] CheckInDto payload)
        {
            try
            {
                if (payload == null || string.IsNullOrWhiteSpace(payload.UserId))
                {
                    return BadRequest(new { message = "UserId es requerido" });
                }

                var eventType = string.IsNullOrWhiteSpace(payload.EventType) ? "entrada" : payload.EventType;

                var success = await _attendanceService.RegistrarAsistenciaAsync(payload.UserId, eventType);
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
        /// POST /api/attendance/verify-face - Verifica identidad facial antes de registrar asistencia
        /// Requiere que el empleado ya haya subido una foto de referencia
        /// </summary>
        [HttpPost("verify-face")]
        public async Task<IActionResult> VerifyFaceAndRegister([FromBody] FaceVerificationRequestDto payload)
        {
            try
            {
                if (payload == null || string.IsNullOrWhiteSpace(payload.UserId))
                    return BadRequest(new { message = "UserId es requerido" });

                if (string.IsNullOrWhiteSpace(payload.CapturePhotoBase64))
                    return BadRequest(new { message = "Foto capturada es requerida" });

                // 1. Obtener foto guardada del empleado
                var (success, referenceUrl) = await _photoService.ObtenerFotoEmpleadoAsync(payload.UserId);
                if (!success || string.IsNullOrWhiteSpace(referenceUrl))
                    return StatusCode(404, new { message = "Foto de referencia no encontrada. Actualizar foto de perfil." });

                // 2. Guardar foto capturada temporalmente
                var (uploaded, captureUrl, uploadMsg) = await _photoService.GuardarFotoEmpleadoAsync(
                    payload.UserId,
                    payload.CapturePhotoBase64,
                    "image/jpeg"
                );
                if (!uploaded)
                    return StatusCode(500, new { message = "Error subiendo foto capturada" });

                // 3. Verificar con TPU
                var (verified, distance, confidence, verifyMsg) = await _faceVerificationService.VerifyFaceAsync(
                    referenceUrl,
                    captureUrl,
                    0.6  // umbral: distancia < 0.6 = coincide
                );

                if (!verified)
                {
                    _logger.LogWarning("Verificación facial fallida para {UserId}: distance={Distance}, confidence={Confidence}", 
                        payload.UserId, distance, confidence);
                    return StatusCode(403, new
                    {
                        success = false,
                        message = "No se pudo verificar identidad",
                        distance,
                        confidence
                    });
                }

                // 4. Registrar asistencia
                var registered = await _attendanceService.RegistrarAsistenciaAsync(
                    payload.UserId,
                    payload.EventType ?? "entrada"
                );
                if (!registered)
                    return StatusCode(500, new { message = "Error registrando asistencia después de verificación" });

                _logger.LogInformation("Verificación facial exitosa y asistencia registrada para {UserId}", payload.UserId);

                return Ok(new
                {
                    success = true,
                    message = "Identidad verificada y asistencia registrada",
                    verified = true,
                    distance,
                    confidence,
                    eventType = payload.EventType ?? "entrada",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en verificación facial");
                return StatusCode(500, new { message = "Error en verificación facial" });
            }
        }
    }
}
