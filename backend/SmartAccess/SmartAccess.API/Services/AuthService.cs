using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.IdentityModel.Tokens;
using SmartAccess.API.DTOs;
using SmartAccess.API.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace SmartAccess.API.Services
{
    public class AuthService
    {
        private static readonly HashSet<string> LegacyAdminRoles = new(StringComparer.OrdinalIgnoreCase)
        {
            "Jefe",
            "Subjefe",
            "Contador",
            "Asistente del Jefe"
        };

        private readonly FirebaseService _firebaseService;
        private readonly ILogger<AuthService> _logger;
        private readonly IConfiguration _configuration;

        public AuthService(FirebaseService firebaseService, ILogger<AuthService> logger, IConfiguration configuration)
        {
            _firebaseService = firebaseService ?? throw new ArgumentNullException(nameof(firebaseService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));

            InitializeFirebaseApp();
        }

        private void InitializeFirebaseApp()
        {
            try
            {
                if (FirebaseApp.DefaultInstance == null)
                {
                    var credentialPath = Path.Combine(AppContext.BaseDirectory, "Config/firebase-credentials.json");
                    var credential = GoogleCredential.FromFile(credentialPath);

                    FirebaseApp.Create(new AppOptions { Credential = credential });
                    _logger.LogInformation("Firebase App inicializado correctamente.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inicializando Firebase: {Message}", ex.Message);
                throw;
            }
        }

        public async Task<User?> ValidarTokenFirebaseAsync(string idToken)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(idToken))
                {
                    _logger.LogWarning("Token vacío recibido.");
                    return null;
                }

                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
                var uid = decodedToken.Uid;

                var usuarioDb = await ObtenerUsuarioAsync(uid);
                return usuarioDb;
            }
            catch (FirebaseAuthException ex)
            {
                _logger.LogWarning("Token inválido o expirado: {Message}", ex.Message);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validando token: {Message}", ex.Message);
                return null;
            }
        }

        public async Task<(User? User, string ErrorCode)> RegistrarUsuarioAsync(RegisterDto registerDto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(registerDto.Email) || string.IsNullOrWhiteSpace(registerDto.Password))
                {
                    _logger.LogWarning("Registro inválido: email o password vacíos.");
                    return (null, "invalid-data");
                }

                var nombre = !string.IsNullOrWhiteSpace(registerDto.FullName)
                    ? registerDto.FullName.Trim()
                    : registerDto.Name.Trim();

                if (string.IsNullOrWhiteSpace(nombre))
                {
                    nombre = registerDto.Email.Split('@')[0];
                }

                var rol = NormalizeSystemRole(registerDto.Rol);

                var userRecord = await FirebaseAuth.DefaultInstance.CreateUserAsync(new UserRecordArgs
                {
                    Email = registerDto.Email.Trim(),
                    Password = registerDto.Password,
                    DisplayName = nombre,
                    Disabled = false
                });

                var userData = new Dictionary<string, object>
                {
                    ["Email"] = userRecord.Email ?? registerDto.Email.Trim(),
                    ["Nombre"] = nombre,
                    ["Rol"] = rol,
                    ["PasswordHash"] = HashPassword(registerDto.Password),
                    ["CheckedIn"] = false,
                    ["CreatedAt"] = Timestamp.GetCurrentTimestamp()
                };

                await _firebaseService.GetCollection("Users").Document(userRecord.Uid).SetAsync(userData);

                await _firebaseService.GetCollection("Employees").Document(userRecord.Uid).SetAsync(new Dictionary<string, object>
                {
                    ["id"] = userRecord.Uid,
                    ["userId"] = userRecord.Uid,
                    ["nombre"] = nombre,
                    ["email"] = userRecord.Email ?? registerDto.Email.Trim(),
                    ["cargo"] = "Pendiente",
                    ["departamento"] = string.Empty,
                    ["turnoId"] = string.Empty,
                    ["turnoNombre"] = string.Empty,
                    ["horarioEntrada"] = string.Empty,
                    ["horarioSalida"] = string.Empty,
                    ["activo"] = false,
                    ["rol"] = "Usuario",
                    ["createdAt"] = Timestamp.GetCurrentTimestamp(),
                    ["createdBy"] = userRecord.Uid
                });

                return (new User
                {
                    UserId = userRecord.Uid,
                    Email = userRecord.Email ?? registerDto.Email.Trim(),
                    Nombre = nombre,
                    Rol = rol,
                    CheckedIn = false
                }, string.Empty);
            }
            catch (FirebaseAuthException ex) when (IsEmailExistsError(ex))
            {
                _logger.LogWarning(ex, "Error de Firebase al registrar usuario: {Message}", ex.Message);
                return (null, "email-exists");
            }
            catch (FirebaseAuthException ex)
            {
                _logger.LogWarning(ex, "Error de Firebase al registrar usuario: {Message}", ex.Message);
                return (null, "firebase-error");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registrando usuario: {Message}", ex.Message);
                return (null, "error");
            }
        }

        public async Task<string?> GenerarJwtDesdeCredencialesAsync(TokenRequestDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                {
                    return null;
                }

                var snapshot = await _firebaseService
                    .GetCollection("Users")
                    .WhereEqualTo("Email", dto.Email.Trim())
                    .Limit(1)
                    .GetSnapshotAsync();

                if (snapshot.Count == 0)
                {
                    _logger.LogWarning("No existe usuario para el correo {Email}", dto.Email);
                    return null;
                }

                var document = snapshot.Documents[0];
                var data = document.ToDictionary();

                if (!data.TryGetValue("PasswordHash", out var hashObj) || hashObj is not string storedHash)
                {
                    _logger.LogWarning("Usuario {Email} no tiene PasswordHash almacenado.", dto.Email);
                    return null;
                }

                if (!VerifyPassword(dto.Password, storedHash))
                {
                    _logger.LogWarning("Password inválido para el correo {Email}", dto.Email);
                    return null;
                }

                var email = data.TryGetValue("Email", out var emailObj) ? emailObj?.ToString() ?? dto.Email.Trim() : dto.Email.Trim();
                var nombre = data.TryGetValue("Nombre", out var nombreObj) ? nombreObj?.ToString() ?? string.Empty : string.Empty;
                var rol = NormalizeSystemRole(data.TryGetValue("Rol", out var rolObj) ? rolObj?.ToString() ?? "Usuario" : "Usuario");

                var claims = new[]
                {
                    new Claim(JwtRegisteredClaimNames.Sub, document.Id),
                    new Claim(ClaimTypes.NameIdentifier, document.Id),
                    new Claim(ClaimTypes.Email, email),
                    new Claim(ClaimTypes.Role, rol),
                    new Claim("nombre", nombre)
                };

                var issuer = _configuration["Jwt:Issuer"] ?? "SmartAccess.API";
                var audience = _configuration["Jwt:Audience"] ?? "SmartAccess.Client";
                var keyValue = _configuration["Jwt:Key"] ?? "SmartAccess.Dev.SuperSecretKey.ChangeMe.123456789";

                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyValue));
                var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                var token = new JwtSecurityToken(
                    issuer: issuer,
                    audience: audience,
                    claims: claims,
                    expires: DateTime.UtcNow.AddHours(8),
                    signingCredentials: credentials);

                return new JwtSecurityTokenHandler().WriteToken(token);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generando JWT con credenciales: {Message}", ex.Message);
                return null;
            }
        }

        private static bool VerifyPassword(string plainPassword, string passwordHash)
        {
            return HashPassword(plainPassword) == passwordHash;
        }

        private static string HashPassword(string password)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }

        public async Task<(bool Success, string ErrorCode)> ActualizarUsuarioAsync(string uid, UpdateUserDto dto)
        {
            try
            {
                var docRef = _firebaseService.GetCollection("Users").Document(uid);
                var snapshot = await docRef.GetSnapshotAsync();
                if (!snapshot.Exists)
                {
                    return (false, "not-found");
                }

                var currentData = snapshot.ToDictionary();
                var currentEmail = currentData.TryGetValue("Email", out var emailObj) ? emailObj?.ToString() ?? string.Empty : string.Empty;
                var currentNombre = currentData.TryGetValue("Nombre", out var nombreObj) ? nombreObj?.ToString() ?? string.Empty : string.Empty;
                var currentRol = NormalizeSystemRole(currentData.TryGetValue("Rol", out var rolObj) ? rolObj?.ToString() ?? "Usuario" : "Usuario");

                var nextEmail = string.IsNullOrWhiteSpace(dto.Email) ? currentEmail : dto.Email.Trim();
                var nextNombre = !string.IsNullOrWhiteSpace(dto.FullName)
                    ? dto.FullName.Trim()
                    : (!string.IsNullOrWhiteSpace(dto.Name) ? dto.Name.Trim() : currentNombre);
                var nextRol = string.IsNullOrWhiteSpace(dto.Rol) ? currentRol : NormalizeSystemRole(dto.Rol.Trim());

                if (string.IsNullOrWhiteSpace(nextEmail) || string.IsNullOrWhiteSpace(nextNombre))
                {
                    return (false, "invalid-data");
                }

                await FirebaseAuth.DefaultInstance.UpdateUserAsync(new UserRecordArgs
                {
                    Uid = uid,
                    Email = nextEmail,
                    DisplayName = nextNombre
                });

                var updates = new Dictionary<string, object>
                {
                    ["Email"] = nextEmail,
                    ["Nombre"] = nextNombre,
                    ["Rol"] = nextRol,
                    ["UpdatedAt"] = Timestamp.GetCurrentTimestamp()
                };

                await docRef.SetAsync(updates, SetOptions.MergeAll);
                return (true, string.Empty);
            }
            catch (FirebaseAuthException ex) when (IsEmailExistsError(ex))
            {
                return (false, "email-exists");
            }
            catch (FirebaseAuthException ex) when (IsUserNotFoundError(ex))
            {
                return (false, "not-found");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error actualizando usuario {UserId}: {Message}", uid, ex.Message);
                return (false, "error");
            }
        }

        public async Task<(bool Success, string ErrorCode)> CambiarPasswordAsync(string uid, string newPassword)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(newPassword))
                {
                    return (false, "invalid-data");
                }

                await FirebaseAuth.DefaultInstance.UpdateUserAsync(new UserRecordArgs
                {
                    Uid = uid,
                    Password = newPassword
                });

                var docRef = _firebaseService.GetCollection("Users").Document(uid);
                await docRef.SetAsync(new Dictionary<string, object>
                {
                    ["PasswordHash"] = HashPassword(newPassword),
                    ["UpdatedAt"] = Timestamp.GetCurrentTimestamp()
                }, SetOptions.MergeAll);

                return (true, string.Empty);
            }
            catch (FirebaseAuthException ex) when (IsUserNotFoundError(ex))
            {
                return (false, "not-found");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cambiando contraseña para usuario {UserId}: {Message}", uid, ex.Message);
                return (false, "error");
            }
        }

        public async Task<(bool Success, string ErrorCode)> EliminarUsuarioAsync(string uid)
        {
            try
            {
                await FirebaseAuth.DefaultInstance.DeleteUserAsync(uid);

                var docRef = _firebaseService.GetCollection("Users").Document(uid);
                await docRef.DeleteAsync();

                return (true, string.Empty);
            }
            catch (FirebaseAuthException ex) when (IsUserNotFoundError(ex))
            {
                return (false, "not-found");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error eliminando usuario {UserId}: {Message}", uid, ex.Message);
                return (false, "error");
            }
        }

        private static bool IsEmailExistsError(FirebaseAuthException ex)
        {
            return ex.AuthErrorCode == AuthErrorCode.EmailAlreadyExists || ex.Message.Contains("EMAIL_EXISTS", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsUserNotFoundError(FirebaseAuthException ex)
        {
            return ex.AuthErrorCode == AuthErrorCode.UserNotFound || ex.Message.Contains("USER_NOT_FOUND", StringComparison.OrdinalIgnoreCase);
        }

        public async Task<User?> ObtenerUsuarioAsync(string uid)
        {
            try
            {
                var docRef = _firebaseService.GetCollection("Users").Document(uid);
                var snapshot = await docRef.GetSnapshotAsync();

                if (!snapshot.Exists)
                {
                    _logger.LogWarning("Usuario no encontrado: {UserId}", uid);
                    return null;
                }

                return MapUser(snapshot.Id, snapshot.ToDictionary());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo usuario {UserId}: {Message}", uid, ex.Message);
                return null;
            }
        }

        public async Task<User?> ObtenerUsuarioPorEmailAsync(string email)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(email))
                {
                    return null;
                }

                var snapshot = await _firebaseService
                    .GetCollection("Users")
                    .WhereEqualTo("Email", email.Trim())
                    .Limit(1)
                    .GetSnapshotAsync();

                if (snapshot.Count == 0)
                {
                    _logger.LogWarning("Usuario no encontrado por email: {Email}", email);
                    return null;
                }

                var document = snapshot.Documents[0];
                return MapUser(document.Id, document.ToDictionary());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo usuario por email {Email}: {Message}", email, ex.Message);
                return null;
            }
        }

        private static User MapUser(string userId, IReadOnlyDictionary<string, object> data)
        {
            var email = data.TryGetValue("Email", out var emailObj) ? emailObj?.ToString() ?? string.Empty : string.Empty;
            var nombre = data.TryGetValue("Nombre", out var nombreObj) ? nombreObj?.ToString() ?? string.Empty : string.Empty;
            var rol = NormalizeSystemRole(data.TryGetValue("Rol", out var rolObj) ? rolObj?.ToString() ?? "Usuario" : "Usuario");
            var checkedIn = data.TryGetValue("CheckedIn", out var checkedInObj) && checkedInObj is bool checkedInValue && checkedInValue;

            return new User
            {
                UserId = userId,
                Email = email,
                Nombre = nombre,
                Rol = rol,
                CheckedIn = checkedIn
            };
        }

        private static string NormalizeSystemRole(string? rol)
        {
            var value = (rol ?? string.Empty).Trim();
            if (string.Equals(value, "Administrador", StringComparison.OrdinalIgnoreCase) || LegacyAdminRoles.Contains(value))
            {
                return "Administrador";
            }

            return "Usuario";
        }

        public async Task<bool> ActualizarCheckInAsync(string uid, bool checkIn)
        {
            try
            {
                var docRef = _firebaseService.GetCollection("Users").Document(uid);
                await docRef.UpdateAsync("CheckedIn", checkIn);
                _logger.LogInformation("CheckIn actualizado correctamente. Estado: {CheckedIn}", checkIn);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error actualizando CheckIn.");
                return false;
            }
        }
    }
}
