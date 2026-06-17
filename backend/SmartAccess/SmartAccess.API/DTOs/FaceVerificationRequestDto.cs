namespace SmartAccess.API.DTOs
{
    public class FaceVerificationRequestDto
    {
        public string UserId { get; set; } = string.Empty;
        public string CapturePhotoBase64 { get; set; } = string.Empty;  // Foto capturada en check-in
        public string EventType { get; set; } = "entrada";  // entrada o salida
        public Dictionary<string, object>? Ubicacion { get; set; }
    }
}
