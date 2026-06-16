using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmartAccess.API.DTOs
{
    public class HorarioSemanalDto
    {
        [Required(ErrorMessage = "Los días laborables son obligatorios.")]
        [MinLength(1, ErrorMessage = "Debe incluir al menos un día laboral.")]
        // Ejemplo esperado: [1, 2, 3, 4, 5] (donde 1 = Lunes y 5 = Viernes)
        public List<int> DiasLaborables { get; set; } = new List<int>();
        public object UserId { get; internal set; }
        public string UsuarioId { get; internal set; }
    }
}
