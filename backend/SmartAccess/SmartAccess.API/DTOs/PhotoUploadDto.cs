namespace SmartAccess.API.DTOs
{
    public class PhotoUploadDto
    {
        public string UserId { get; set; } = string.Empty;
        public string Base64Photo { get; set; } = string.Empty;  // Foto en base64
        public string ContentType { get; set; } = "image/jpeg";  // image/jpeg, image/png
    }
}
