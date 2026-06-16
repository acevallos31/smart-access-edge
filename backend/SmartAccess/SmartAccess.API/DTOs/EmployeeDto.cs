namespace SmartAccess.API.DTOs
{
    public class EmployeeDto
    {
        public string Nombre { get; set; } = string.Empty;
        public string Departamento { get; set; } = string.Empty;
        public string Cargo { get; set; } = string.Empty;
        public string HorarioAsignado { get; set; } = string.Empty;
        public string FotoReferenciaUrl { get; set; } = string.Empty;
        public bool? Activo { get; set; }
    }
}
