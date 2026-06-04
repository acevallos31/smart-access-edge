namespace SmartAccess.API.DTOs
{
    public class RegisterDto
    {

        // lo que el fontend manda cuando alguien se quiere registrar

        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; }

        public string Name { get; set; }

    }
}
