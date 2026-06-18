namespace SmartAccess.API.DTOs
{
    public class FaceEnrollDto
    {
        public string UserId { get; set; } = string.Empty;
        public string ImageBase64 { get; set; } = string.Empty;
        public string ContentType { get; set; } = "image/jpeg";
    }
}
