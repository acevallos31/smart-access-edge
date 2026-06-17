namespace SmartAccess.API.DTOs
{
    public class TurnoDto
    {
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public string? Departamento { get; set; }
        public bool Activo { get; set; } = true;

        public HorarioDiaDto? Lunes { get; set; }
        public HorarioDiaDto? Martes { get; set; }
        public HorarioDiaDto? Miercoles { get; set; }
        public HorarioDiaDto? Jueves { get; set; }
        public HorarioDiaDto? Viernes { get; set; }
        public HorarioDiaDto? Sabado { get; set; }
        public HorarioDiaDto? Domingo { get; set; }
    }

    public class HorarioDiaDto
    {
        public string Entrada { get; set; } = "08:00";
        public string Salida { get; set; } = "17:00";
        public string? AlmuerzoInicio { get; set; }
        public string? AlmuerzoFin { get; set; }
        public bool Trabaja { get; set; } = false;
    }
}