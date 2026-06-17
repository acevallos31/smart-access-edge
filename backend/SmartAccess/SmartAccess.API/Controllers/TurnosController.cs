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

            if (string.IsNullOrWhiteSpace(turno.Departamento))
            {
                return BadRequest(new { message = "El departamento del turno es requerido." });
            }

            var validationError = ValidateTurno(turno);
            if (validationError != null)
            {
                return BadRequest(new { message = validationError });
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

            if (string.IsNullOrWhiteSpace(turno.Departamento))
            {
                var existingData = snapshot.ToDictionary();
                if (existingData.TryGetValue("departamento", out var departamentoExistente) && !string.IsNullOrWhiteSpace(departamentoExistente?.ToString()))
                {
                    turno.Departamento = departamentoExistente.ToString();
                }
            }

            if (string.IsNullOrWhiteSpace(turno.Departamento))
            {
                return BadRequest(new { message = "El departamento del turno es requerido." });
            }

            var validationError = ValidateTurno(turno);
            if (validationError != null)
            {
                return BadRequest(new { message = validationError });
            }

            var existing = snapshot.ToDictionary();
            var activoExistente = existing.TryGetValue("activo", out var activoObj) && activoObj is bool activoBool
                ? activoBool
                : turno.Activo;

            var data = ToDictionary(turno);
            data["departamento"] = turno.Departamento.Trim();
            data["activo"] = activoExistente;
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

        [HttpPost("{id}/copy")]
        public async Task<IActionResult> Copy(string id, [FromBody] CopyTurnoDto dto)
        {
            var snapshot = await _firebaseService.GetCollection("Turnos").Document(id).GetSnapshotAsync();
            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Turno no encontrado" });
            }

            if (dto == null || string.IsNullOrWhiteSpace(dto.Departamento))
            {
                return BadRequest(new { message = "El departamento destino es requerido." });
            }

            var source = snapshot.ToDictionary();
            var newId = Guid.NewGuid().ToString();
            var data = new Dictionary<string, object>(source)
            {
                ["id"] = newId,
                ["departamento"] = dto.Departamento.Trim(),
                ["nombre"] = string.IsNullOrWhiteSpace(dto.Nombre) ? $"{source.GetValueOrDefault("nombre", "Turno")}" : dto.Nombre.Trim(),
                ["createdAt"] = Timestamp.GetCurrentTimestamp()
            };

            await _firebaseService.GetCollection("Turnos").Document(newId).SetAsync(data);
            return Ok(data);
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
                ["departamento"] = turno.Departamento ?? string.Empty,
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
                ["almuerzoInicio"] = dia.AlmuerzoInicio ?? string.Empty,
                ["almuerzoFin"] = dia.AlmuerzoFin ?? string.Empty,
                ["trabaja"] = dia.Trabaja
            };
        }

        private static string? ValidateTurno(TurnoDto turno)
        {
            foreach (var (dia, horario) in new (string Dia, HorarioDiaDto? Horario)[]
            {
                ("Lunes", turno.Lunes),
                ("Martes", turno.Martes),
                ("Miercoles", turno.Miercoles),
                ("Jueves", turno.Jueves),
                ("Viernes", turno.Viernes),
                ("Sabado", turno.Sabado),
                ("Domingo", turno.Domingo)
            })
            {
                if (horario == null || !horario.Trabaja)
                {
                    continue;
                }

                if (!TryParseTime(horario.Entrada, out var entrada) || !TryParseTime(horario.Salida, out var salida))
                {
                    return $"{dia}: hora de entrada/salida inválida.";
                }

                if (entrada >= salida)
                {
                    return $"{dia}: la entrada debe ser menor que la salida.";
                }

                var hasLunchStart = !string.IsNullOrWhiteSpace(horario.AlmuerzoInicio);
                var hasLunchEnd = !string.IsNullOrWhiteSpace(horario.AlmuerzoFin);

                if (hasLunchStart != hasLunchEnd)
                {
                    return $"{dia}: debe definir inicio y fin de almuerzo.";
                }

                if (hasLunchStart && hasLunchEnd)
                {
                    if (!TryParseTime(horario.AlmuerzoInicio!, out var almuerzoInicio) ||
                        !TryParseTime(horario.AlmuerzoFin!, out var almuerzoFin))
                    {
                        return $"{dia}: horario de almuerzo inválido.";
                    }

                    if (almuerzoInicio >= almuerzoFin)
                    {
                        return $"{dia}: el inicio de almuerzo debe ser menor que el fin.";
                    }

                    if (almuerzoInicio <= entrada || almuerzoFin >= salida)
                    {
                        return $"{dia}: el horario de almuerzo debe estar dentro del turno.";
                    }
                }
            }

            return null;
        }

        private static bool TryParseTime(string? value, out TimeSpan time)
        {
            return TimeSpan.TryParse(value, out time);
        }

        public class CopyTurnoDto
        {
            public string Departamento { get; set; } = string.Empty;
            public string? Nombre { get; set; }
        }
    }
}