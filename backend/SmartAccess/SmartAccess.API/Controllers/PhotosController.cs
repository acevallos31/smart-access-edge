using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.DTOs;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PhotosController : ControllerBase
    {
        private readonly PhotoService _photoService;
        private readonly ILogger<PhotosController> _logger;

        public PhotosController(PhotoService photoService, ILogger<PhotosController> logger)
        {
            _photoService = photoService ?? throw new ArgumentNullException(nameof(photoService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// POST /api/photos/upload - Sube foto del empleado a Firebase Storage
        /// </summary>
        [HttpPost("upload")]
        public async Task<IActionResult> UploadPhoto([FromBody] PhotoUploadDto payload)
        {
            try
            {
                if (payload == null || string.IsNullOrWhiteSpace(payload.UserId))
                    return BadRequest(new { message = "UserId es requerido" });

                var (success, url, message) = await _photoService.GuardarFotoEmpleadoAsync(
                    payload.UserId,
                    payload.Base64Photo,
                    payload.ContentType
                );

                if (!success)
                    return StatusCode(400, new { message });

                return Ok(new
                {
                    success = true,
                    fotoUrl = url,
                    message = "Foto guardada correctamente"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en UploadPhoto");
                return StatusCode(500, new { message = "Error subiendo foto" });
            }
        }

        /// <summary>
        /// GET /api/photos/{userId} - Obtiene URL de la foto del empleado
        /// </summary>
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetPhoto(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                    return BadRequest(new { message = "UserId es requerido" });

                var (success, url) = await _photoService.ObtenerFotoEmpleadoAsync(userId);
                if (!success)
                    return NotFound(new { message = "Foto no encontrada" });

                return Ok(new { fotoUrl = url });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en GetPhoto");
                return StatusCode(500, new { message = "Error obteniendo foto" });
            }
        }

        /// <summary>
        /// DELETE /api/photos/{userId} - Elimina foto del empleado
        /// </summary>
        [HttpDelete("{userId}")]
        public async Task<IActionResult> DeletePhoto(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                    return BadRequest(new { message = "UserId es requerido" });

                bool deleted = await _photoService.EliminarFotoAsync(userId);
                if (!deleted)
                    return StatusCode(500, new { message = "Error eliminando foto" });

                return Ok(new { message = "Foto eliminada" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en DeletePhoto");
                return StatusCode(500, new { message = "Error eliminando foto" });
            }
        }
    }
}
