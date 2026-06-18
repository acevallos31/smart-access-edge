namespace SmartAccess.API.DTOs
{
    public class EmployeeDto
    {
        public string Nombre { get; set; } = string.Empty;
        public string Departamento { get; set; } = string.Empty;
        public string Rol { get; set; } = "Empleado";
        public string Cargo { get; set; } = string.Empty;
        public string HorarioAsignado { get; set; } = string.Empty;
        public string HorarioEntrada { get; set; } = string.Empty;
        public string HorarioSalida { get; set; } = string.Empty;
        public string TurnoId { get; set; } = string.Empty;
        public string TurnoNombre { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Rol { get; set; } = "Usuario";
        public string FotoReferenciaUrl { get; set; } = string.Empty;
        public string FotoUrl { get; set; } = string.Empty;
        public bool? Activo { get; set; }
    }
}
