using Google.Cloud.Storage.V1;
using Google.Cloud.Firestore;

namespace SmartAccess.API.Services
{
    public class PhotoService
    {
        private readonly StorageClient _storageClient;
        private readonly FirebaseService _firebaseService;
        private readonly ILogger<PhotoService> _logger;
        private const string BucketName = "smart-access-edge.appspot.com";
        private const string PhotosFolder = "empleados-fotos";

        public PhotoService(FirebaseService firebaseService, ILogger<PhotoService> logger)
        {
            _storageClient = StorageClient.Create();
            _firebaseService = firebaseService ?? throw new ArgumentNullException(nameof(firebaseService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Guarda foto del empleado en Firebase Storage y actualiza referencia en Firestore
        /// </summary>
        public async Task<(bool success, string url, string message)> GuardarFotoEmpleadoAsync(
            string userId, string base64Photo, string contentType = "image/jpeg")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(base64Photo))
                    return (false, "", "UserId o foto vacíos");

                // Convertir base64 a bytes
                byte[] photoBytes;
                try
                {
                    photoBytes = Convert.FromBase64String(base64Photo);
                }
                catch
                {
                    return (false, "", "Base64 inválido");
                }

                // Ruta en Storage: empleados-fotos/{userId}/photo.jpg
                string objectName = $"{PhotosFolder}/{userId}/photo.jpg";

                // Subir a Storage
                var uploadOptions = new UploadObjectOptions();
                await _storageClient.UploadObjectAsync(
                    BucketName,
                    objectName,
                    contentType,
                    new MemoryStream(photoBytes),
                    uploadOptions
                );

                // URL pública (signed URL válida 30 días, o usar URL pública si el bucket es público)
                string photoUrl = $"https://storage.googleapis.com/{BucketName}/{objectName}";

                // Actualizar Firestore con referencia a la foto
                var employeeRef = _firebaseService.GetCollection("Employees").Document(userId);
                await employeeRef.UpdateAsync(new Dictionary<string, object>
                {
                    ["fotoUrl"] = photoUrl,
                    ["fotoActualizada"] = Timestamp.GetCurrentTimestamp()
                });

                _logger.LogInformation("Foto guardada para empleado {UserId} en {Url}", userId, photoUrl);
                return (true, photoUrl, "Foto guardada correctamente");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error guardando foto para {UserId}", userId);
                return (false, "", $"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Obtiene la foto del empleado desde Firestore
        /// </summary>
        public async Task<(bool success, string url)> ObtenerFotoEmpleadoAsync(string userId)
        {
            try
            {
                var doc = await _firebaseService.GetCollection("Employees")
                    .Document(userId)
                    .GetSnapshotAsync();

                if (!doc.Exists || !doc.TryGetValue<string>("fotoUrl", out var urlObj))
                    return (false, "");

                return (true, urlObj ?? "");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo foto para {UserId}", userId);
                return (false, "");
            }
        }

        /// <summary>
        /// Elimina la foto del empleado (si es necesario)
        /// </summary>
        public async Task<bool> EliminarFotoAsync(string userId)
        {
            try
            {
                string objectName = $"{PhotosFolder}/{userId}/photo.jpg";
                await _storageClient.DeleteObjectAsync(BucketName, objectName);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error eliminando foto para {UserId}", userId);
                return false;
            }
        }
    }
}
