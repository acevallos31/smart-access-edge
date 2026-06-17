using Microsoft.AspNetCore.Authorization;
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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
        {
            if (registerDto == null || string.IsNullOrWhiteSpace(registerDto.Email) || string.IsNullOrWhiteSpace(registerDto.Password))
            {
                return BadRequest(new { message = "Email y password son requeridos." });
            }

            var result = await _authService.RegistrarUsuarioAsync(registerDto);
            if (!string.IsNullOrWhiteSpace(result.ErrorCode))
            {
                return result.ErrorCode switch
                {
                    "email-exists" => Conflict(new { message = "El correo ya existe." }),
                    "invalid-data" => BadRequest(new { message = "Datos inválidos para registro." }),
                    _ => BadRequest(new { message = "No se pudo registrar el usuario." })
                };
            }

            return Ok(new
            {
                message = "Usuario registrado correctamente.",
                user = result.User
            });
        }

        [HttpPost("token")]
        [HttpPost("login")]  // Alias para frontend compatibility
        public async Task<IActionResult> GenerarToken([FromBody] TokenRequestDto tokenRequest)
        {
            if (tokenRequest == null || string.IsNullOrWhiteSpace(tokenRequest.Email) || string.IsNullOrWhiteSpace(tokenRequest.Password))
            {
                return BadRequest(new { message = "Email y password son requeridos." });
            }

            var token = await _authService.GenerarJwtDesdeCredencialesAsync(tokenRequest);
            if (string.IsNullOrWhiteSpace(token))
            {
                return Unauthorized(new { message = "Credenciales inválidas o usuario sin hash de contraseña." });
            }

            return Ok(new
            {
                token,
                tokenType = "Bearer"
            });
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
                _logger.LogWarning("Intento de login fallido con token inválido.");
                return Unauthorized(new { message = "Acceso denegado. Token inválido." });
            }

            _logger.LogInformation("Usuario {Email} ha iniciado sesión correctamente.", usuarioValido.Email);
            return Ok(usuarioValido);
        }

        [HttpPost("check-in")]
        [Authorize]
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

            return Ok(new { success = true, message = "Check-in registrado correctamente.", eventType = "entrada" });
        }

        [HttpPost("check-out")]
        [Authorize]
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

            return Ok(new { success = true, message = "Check-out registrado correctamente.", eventType = "salida" });
        }

        [HttpGet("check-status/{userId}")]
        [Authorize]
        public async Task<IActionResult> GetCheckStatus(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return BadRequest(new { message = "UserId requerido." });
            }

            var user = await _authService.ObtenerUsuarioAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Usuario no encontrado." });
            }

            return Ok(new { checkedIn = user.CheckedIn });
        }
    }
}
