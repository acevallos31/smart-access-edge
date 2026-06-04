using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using SmartAccess.API.Models;

namespace SmartAccess.API.Services
{
    public class AuthService
    {
        private readonly FirebaseService _firebaseService;
        private readonly ILogger<AuthService> _logger;

        public AuthService(FirebaseService firebaseService, ILogger<AuthService> logger)
        {
            _firebaseService = firebaseService ?? throw new ArgumentNullException(nameof(firebaseService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

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

                return new User
                {
                    UserId = uid,
                    Email = snapshot.GetValue<string>("Email") ?? string.Empty,
                    Nombre = snapshot.GetValue<string>("Nombre") ?? string.Empty,
                    Rol = snapshot.GetValue<string>("Rol") ?? "Empleado",
                    CheckedIn = snapshot.GetValue<bool>("CheckedIn")
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo usuario {UserId}: {Message}", uid, ex.Message);
                return null;
            }
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
