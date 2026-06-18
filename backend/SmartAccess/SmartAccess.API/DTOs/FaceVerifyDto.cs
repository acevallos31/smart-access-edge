namespace SmartAccess.API.DTOs
{
    public class FaceVerifyDto
    {
        public string UserId { get; set; } = string.Empty;
        public string ImageBase64 { get; set; } = string.Empty;
        public string ContentType { get; set; } = "image/jpeg";
        public double Threshold { get; set; } = 0.75;
        public bool StrictMode { get; set; } = false;
    }
}
