using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.DTOs;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AuthService _authService;

        public UsersController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpGet("{uid}")]
        public async Task<IActionResult> GetById(string uid)
        {
            var user = await _authService.ObtenerUsuarioAsync(uid);
            if (user == null)
            {
                return NotFound(new { message = "Usuario no encontrado." });
            }

            return Ok(user);
        }

        [HttpGet("by-email")]
        public async Task<IActionResult> GetByEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "Email es requerido." });
            }

            var user = await _authService.ObtenerUsuarioPorEmailAsync(email);
            if (user == null)
            {
                return NotFound(new { message = "Usuario no encontrado." });
            }

            return Ok(user);
        }

        [HttpPut("{uid}")]
        public async Task<IActionResult> UpdateUser(string uid, [FromBody] UpdateUserDto dto)
        {
            if (dto == null)
            {
                return BadRequest(new { message = "Body requerido." });
            }

            var result = await _authService.ActualizarUsuarioAsync(uid, dto);
            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    "not-found" => NotFound(new { message = "Usuario no encontrado." }),
                    "invalid-data" => BadRequest(new { message = "Datos inválidos para actualizar usuario." }),
                    "email-exists" => Conflict(new { message = "El correo ya existe." }),
                    _ => StatusCode(500, new { message = "Error actualizando usuario." })
                };
            }

            var user = await _authService.ObtenerUsuarioAsync(uid);
            return Ok(user);
        }

        [HttpPatch("{uid}/password")]
        public async Task<IActionResult> ChangePassword(string uid, [FromBody] ChangePasswordDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                return BadRequest(new { message = "NewPassword es requerido." });
            }

            var result = await _authService.CambiarPasswordAsync(uid, dto.NewPassword);
            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    "not-found" => NotFound(new { message = "Usuario no encontrado." }),
                    "invalid-data" => BadRequest(new { message = "Datos inválidos para cambio de contraseña." }),
                    _ => StatusCode(500, new { message = "Error cambiando contraseña." })
                };
            }

            return Ok(new { message = "Contraseña actualizada correctamente." });
        }

        [HttpDelete("{uid}")]
        public async Task<IActionResult> DeleteUser(string uid)
        {
            var result = await _authService.EliminarUsuarioAsync(uid);
            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    "not-found" => NotFound(new { message = "Usuario no encontrado." }),
                    _ => StatusCode(500, new { message = "Error eliminando usuario." })
                };
            }

            return NoContent();
        }
    }
}
