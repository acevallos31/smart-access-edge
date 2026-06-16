namespace SmartAccess.API.DTOs
{
    public class RegisterDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
<<<<<<< HEAD
        public string Email { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

=======
        public string Name { get; set; } = string.Empty;
        public string Rol { get; set; } = "Empleado";
>>>>>>> fb8cb63facb4d8c4b329d0e299279f4ace0da223
    }
}
