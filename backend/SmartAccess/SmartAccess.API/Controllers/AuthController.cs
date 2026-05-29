using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService = new AuthService();

        [HttpPost("login-verificar")]
        public async Task<IActionResult> VerificarToken([FromBody] string token)
        {
            var usuarioValido = await _authService.ValidarTokenFirebaseAsync(token);
            if (usuarioValido == null)
            {
                return Unauthorized(new { message = "Acceso denegado. Token inválido." });
            }
            return Ok(usuarioValido); // Devuelve el rol para que Angular distribuya al usuario
        }
    }
}