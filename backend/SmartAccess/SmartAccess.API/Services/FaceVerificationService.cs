using System.Net.Http.Json;
using System.Text.Json;

namespace SmartAccess.API.Services
{
    /// <summary>
    /// Servicio que se conecta al servidor de inferencia TPU para verificación facial.
    /// Asume que el servidor TPU expone un endpoint POST /verify con:
    ///   {
    ///     "reference_photo_url": "https://...",
    ///     "capture_photo_url": "https://...",
    ///     "threshold": 0.6
    ///   }
    /// Responde:
    ///   {
    ///     "verified": true/false,
    ///     "distance": 0.45,
    ///     "confidence": 0.95
    ///   }
    /// </summary>
    public class FaceVerificationService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<FaceVerificationService> _logger;
        private readonly string _tpuServerUrl;
        private readonly string _verifyEndpoint;
        private readonly bool _tpuEnabled;
        private readonly int _timeoutSeconds;

        public FaceVerificationService(IHttpClientFactory httpClientFactory, ILogger<FaceVerificationService> logger, IConfiguration config)
        {
            _httpClient = httpClientFactory.CreateClient();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _tpuServerUrl = config["InferenceServer:Url"] ?? "https://inference-api.nocpbx.com";
            _verifyEndpoint = config["InferenceServer:VerifyEndpoint"] ?? "/verify";
            _tpuEnabled = config.GetValue<bool>("InferenceServer:Enabled", true);
            _timeoutSeconds = config.GetValue<int>("InferenceServer:TimeoutSeconds", 10);
            
            _logger.LogInformation("FaceVerificationService inicializado: Enabled={Enabled}, URL={Url}, Timeout={Timeout}s", 
                _tpuEnabled, _tpuServerUrl, _timeoutSeconds);
        }

        /// <summary>
        /// Indica si la verificación TPU está habilitada
        /// </summary>
        public bool IsEnabled => _tpuEnabled;

        /// <summary>
        /// Verifica si la foto capturada coincide con la foto guardada del empleado.
        /// Si TPU está disabled o hay error de conexión, retorna verified=true (fallback).
        /// </summary>
        public async Task<(bool verified, double distance, double confidence, string message)> VerifyFaceAsync(
            string referencePhotoUrl, string capturePhotoUrl, double threshold = 0.6)
        {
            try
            {
                if (!_tpuEnabled)
                {
                    _logger.LogInformation("Verificación TPU deshabilitada - permitiendo check-in");
                    return (true, 0, 0, "Verificación TPU deshabilitada - acceso permitido");
                }

                if (string.IsNullOrWhiteSpace(referencePhotoUrl) || string.IsNullOrWhiteSpace(capturePhotoUrl))
                    return (true, 0, 0, "URLs no disponibles - verificación omitida");

                var request = new
                {
                    reference_photo_url = referencePhotoUrl,
                    capture_photo_url = capturePhotoUrl,
                    threshold = threshold
                };

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_timeoutSeconds));
                var response = await _httpClient.PostAsJsonAsync(
                    $"{_tpuServerUrl}{_verifyEndpoint}",
                    request,
                    cts.Token
                );

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("TPU Server respondió con error: {StatusCode} - permitiendo acceso", response.StatusCode);
                    return (true, 0, 0, "Servidor TPU no disponible - acceso permitido (fallback)");
                }

                var jsonStr = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<FaceVerificationResponse>(jsonStr);

                if (result == null)
                    return (false, 0, 0, "Respuesta inválida del servidor");

                _logger.LogInformation(
                    "Verificación facial: verified={Verified}, distance={Distance}, confidence={Confidence}",
                    result.verified, result.distance, result.confidence
                );

                return (
                    result.verified,
                    result.distance,
                    result.confidence,
                    result.verified ? "Verificado" : "No coincide"
                );
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Timeout conectando a servidor TPU - permitiendo acceso");
                return (true, 0, 0, "Servidor TPU no responde - acceso permitido (timeout)");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "Error de conexión con servidor TPU - permitiendo acceso");
                return (true, 0, 0, "No se pudo contactar servidor TPU - acceso permitido (conexión)");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado verificando cara - permitiendo acceso");
                return (true, 0, 0, "Error inesperado - acceso permitido (fallback)");
            }
        }

        private class FaceVerificationResponse
        {
            public bool verified { get; set; }
            public double distance { get; set; }
            public double confidence { get; set; }
        }
    }
}




