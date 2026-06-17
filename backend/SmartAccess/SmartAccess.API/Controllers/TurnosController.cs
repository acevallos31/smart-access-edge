using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.DTOs;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TurnosController : ControllerBase
    {
        private readonly FirebaseService _firebaseService;

        public TurnosController(FirebaseService firebaseService)
        {
            _firebaseService = firebaseService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool? soloActivos)
        {
            var query = _firebaseService.GetCollection("Turnos");

            QuerySnapshot snapshot = soloActivos == true
                ? await query.WhereEqualTo("activo", true).GetSnapshotAsync()
                : await query.GetSnapshotAsync();

            var turnos = snapshot.Documents.Select(doc =>
            {
                var data = doc.ToDictionary();
                data["id"] = doc.Id;
                return data;
            });

            return Ok(turnos);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var doc = await _firebaseService
                .GetCollection("Turnos")
                .Document(id)
                .GetSnapshotAsync();

            if (!doc.Exists)
            {
                return NotFound(new { message = "Turno no encontrado" });
            }

            var data = doc.ToDictionary();
            data["id"] = doc.Id;

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TurnoDto turno)
        {
            if (string.IsNullOrWhiteSpace(turno.Nombre))
            {
                return BadRequest(new { message = "El nombre del turno es requerido." });
            }

            var id = Guid.NewGuid().ToString();

            var data = ToDictionary(turno);
            data["id"] = id;
            data["activo"] = turno.Activo;
            data["createdAt"] = Timestamp.GetCurrentTimestamp();

            await _firebaseService
                .GetCollection("Turnos")
                .Document(id)
                .SetAsync(data);

            data["id"] = id;

            return Ok(data);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] TurnoDto turno)
        {
            var docRef = _firebaseService.GetCollection("Turnos").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Turno no encontrado" });
            }

            var data = ToDictionary(turno);
            data["updatedAt"] = Timestamp.GetCurrentTimestamp();

            await docRef.SetAsync(data, SetOptions.MergeAll);

            data["id"] = id;

            return Ok(data);
        }

        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> Activate(string id)
        {
            return await CambiarEstado(id, true);
        }

        [HttpPatch("{id}/deactivate")]
        public async Task<IActionResult> Deactivate(string id)
        {
            return await CambiarEstado(id, false);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var docRef = _firebaseService.GetCollection("Turnos").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Turno no encontrado" });
            }

            await docRef.DeleteAsync();

            return Ok(new { message = "Turno eliminado", id });
        }

        private async Task<IActionResult> CambiarEstado(string id, bool activo)
        {
            var docRef = _firebaseService.GetCollection("Turnos").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Turno no encontrado" });
            }

            await docRef.SetAsync(new Dictionary<string, object>
            {
                ["activo"] = activo,
                ["updatedAt"] = Timestamp.GetCurrentTimestamp()
            }, SetOptions.MergeAll);

            return Ok(new
            {
                message = activo ? "Turno activado" : "Turno desactivado",
                id,
                activo
            });
        }

        private static Dictionary<string, object> ToDictionary(TurnoDto turno)
        {
            return new Dictionary<string, object>
            {
                ["nombre"] = turno.Nombre,
                ["descripcion"] = turno.Descripcion ?? string.Empty,
                ["activo"] = turno.Activo,
                ["lunes"] = ToDictionary(turno.Lunes),
                ["martes"] = ToDictionary(turno.Martes),
                ["miercoles"] = ToDictionary(turno.Miercoles),
                ["jueves"] = ToDictionary(turno.Jueves),
                ["viernes"] = ToDictionary(turno.Viernes),
                ["sabado"] = ToDictionary(turno.Sabado),
                ["domingo"] = ToDictionary(turno.Domingo)
            };
        }

        private static Dictionary<string, object> ToDictionary(HorarioDiaDto? dia)
        {
            dia ??= new HorarioDiaDto();

            return new Dictionary<string, object>
            {
                ["entrada"] = dia.Entrada,
                ["salida"] = dia.Salida,
                ["trabaja"] = dia.Trabaja
            };
        }
    }
}