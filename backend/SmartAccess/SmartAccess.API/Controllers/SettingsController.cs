using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.Services;


namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly FaceVerificationService _faceVerificationService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SettingsController> _logger;

        public SettingsController(
            FaceVerificationService faceVerificationService,
            IConfiguration configuration,
            ILogger<SettingsController> logger)
        {
            _faceVerificationService = faceVerificationService;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// GET /api/settings/face-verification - Obtiene estado de verificación facial
        /// </summary>
        [HttpGet("face-verification")]
        public IActionResult GetFaceVerificationStatus()
        {
            return Ok(new
            {
                enabled = _faceVerificationService.IsEnabled,
                url = _configuration["InferenceServer:Url"],
                endpoint = _configuration["InferenceServer:VerifyEndpoint"],
                timeoutSeconds = _configuration.GetValue<int>("InferenceServer:TimeoutSeconds", 10)
            });
        }

        /// <summary>
        /// POST /api/settings/face-verification/health - Verifica disponibilidad del servidor TPU
        /// </summary>
        [HttpPost("face-verification/health")]
        public async Task<IActionResult> CheckFaceVerificationHealth()
        {
            if (!_faceVerificationService.IsEnabled)
            {
                return Ok(new
                {
                    available = false,
                    message = "Verificación facial TPU deshabilitada"
                });
            }

            try
            {
                var url = _configuration["InferenceServer:Url"];
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
                var response = await client.GetAsync($"{url}/status");

                if (!response.IsSuccessStatusCode)
                {
                    response = await client.GetAsync(url ?? string.Empty);
                }
                
                return Ok(new
                {
                    available = response.IsSuccessStatusCode,
                    statusCode = (int)response.StatusCode,
                    url = url
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error verificando salud del servidor TPU");
                return Ok(new
                {
                    available = false,
                    error = ex.Message
                });
            }
        }
    }
}
