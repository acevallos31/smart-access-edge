namespace SmartAccess.API.Models
{
    public class User
    {
        public string UserId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Rol { get; set; } = "Empleado"; // Administrador o Empleado
        public bool CheckedIn { get; set; } = false;
    }
}