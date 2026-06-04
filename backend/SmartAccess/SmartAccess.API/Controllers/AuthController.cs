using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.DTOs;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(AuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService ?? throw new ArgumentNullException(nameof(authService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpPost("login-verificar")]
        public async Task<IActionResult> VerificarToken([FromBody] LoginDto loginDto)
        {
            if (loginDto == null || string.IsNullOrWhiteSpace(loginDto.IdToken))
            {
                _logger.LogWarning("Token vacío en solicitud de login.");
                return BadRequest(new { message = "Token requerido." });
            }

            var usuarioValido = await _authService.ValidarTokenFirebaseAsync(loginDto.IdToken);
            if (usuarioValido == null)
            {
                _logger.LogWarning($"Intento de login fallido con token inválido.");
                return Unauthorized(new { message = "Acceso denegado. Token inválido." });
            }

            _logger.LogInformation($"Usuario {usuarioValido.Email} ha iniciado sesión correctamente.");
            return Ok(usuarioValido);
        }

        [HttpPost("check-in")]
        public async Task<IActionResult> CheckIn([FromBody] CheckInDto checkInDto)
        {
            if (checkInDto == null || string.IsNullOrWhiteSpace(checkInDto.UserId))
            {
                return BadRequest(new { message = "UserId requerido." });
            }

            var resultado = await _authService.ActualizarCheckInAsync(checkInDto.UserId, true);
            if (!resultado)
            {
                return StatusCode(500, new { message = "Error actualizando check-in." });
            }

            return Ok(new { message = "Check-in registrado correctamente." });
        }

        [HttpPost("check-out")]
        public async Task<IActionResult> CheckOut([FromBody] CheckInDto checkInDto)
        {
            if (checkInDto == null || string.IsNullOrWhiteSpace(checkInDto.UserId))
            {
                return BadRequest(new { message = "UserId requerido." });
            }

            var resultado = await _authService.ActualizarCheckInAsync(checkInDto.UserId, false);
            if (!resultado)
            {
                return StatusCode(500, new { message = "Error actualizando check-out." });
            }

            return Ok(new { message = "Check-out registrado correctamente." });
        }
    }
}
