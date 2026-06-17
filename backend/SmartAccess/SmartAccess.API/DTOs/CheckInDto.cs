namespace SmartAccess.API.DTOs
{
    public class CheckInDto
    {
        public string UserId { get; set; } = string.Empty;
        public string? EventType { get; set; }  // "entrada" o "salida"
        public string? CaptureUrl { get; set; }  // URL de foto facial capturada
        public string? CaptureBase64 { get; set; }  // Imagen en Base64 (alternativa)
        public DateTime? ScheduledTime { get; set; }  // Hora programada del turno
        public string? DepartmentId { get; set; }  // Departamento del empleado
    }
}
