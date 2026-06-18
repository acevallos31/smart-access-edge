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

                var (photoUrl, message) = await UploadPhotoInternalAsync(
                    userId,
                    "photo.jpg",
                    photoBytes,
                    contentType,
                    updateProfileReference: true
                );

                if (string.IsNullOrWhiteSpace(photoUrl))
                    return (false, "", message);

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
        /// Guarda una captura temporal para verificación facial sin sobrescribir la foto de referencia.
        /// </summary>
        public async Task<(bool success, string url, string message)> GuardarCapturaTemporalAsync(
            string userId, string base64Photo, string contentType = "image/jpeg")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(base64Photo))
                    return (false, "", "UserId o foto vacíos");

                byte[] photoBytes;
                try
                {
                    photoBytes = Convert.FromBase64String(base64Photo);
                }
                catch
                {
                    return (false, "", "Base64 inválido");
                }

                var fileName = $"capture-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.jpg";
                var (photoUrl, message) = await UploadPhotoInternalAsync(
                    userId,
                    $"captures/{fileName}",
                    photoBytes,
                    contentType,
                    updateProfileReference: false
                );

                if (string.IsNullOrWhiteSpace(photoUrl))
                    return (false, "", message);

                return (true, photoUrl, "Captura temporal guardada correctamente");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error guardando captura temporal para {UserId}", userId);
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
                var userDoc = await _firebaseService.GetCollection("Users")
                    .Document(userId)
                    .GetSnapshotAsync();

                if (userDoc.Exists && userDoc.TryGetValue<string>("fotoUrl", out var userPhotoUrl) && !string.IsNullOrWhiteSpace(userPhotoUrl))
                    return (true, userPhotoUrl);

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

        private async Task<(string url, string message)> UploadPhotoInternalAsync(
            string userId,
            string fileName,
            byte[] photoBytes,
            string contentType,
            bool updateProfileReference)
        {
            string objectName = $"{PhotosFolder}/{userId}/{fileName}";

            await _storageClient.UploadObjectAsync(
                BucketName,
                objectName,
                contentType,
                new MemoryStream(photoBytes),
                new UploadObjectOptions()
            );

            string photoUrl = $"https://storage.googleapis.com/{BucketName}/{objectName}";

            if (updateProfileReference)
            {
                var updateFields = new Dictionary<string, object>
                {
                    ["fotoUrl"] = photoUrl,
                    ["fotoActualizada"] = Timestamp.GetCurrentTimestamp()
                };

                await _firebaseService.GetCollection("Users").Document(userId).SetAsync(updateFields, SetOptions.MergeAll);
                await _firebaseService.GetCollection("Employees").Document(userId).SetAsync(updateFields, SetOptions.MergeAll);
            }

            return (photoUrl, "OK");
        }
    }
}
