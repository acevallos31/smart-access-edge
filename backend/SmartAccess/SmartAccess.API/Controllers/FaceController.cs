using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.DTOs;
using SmartAccess.API.Services;

namespace SmartAccess.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FaceController : ControllerBase
    {
        private readonly FirebaseService _firebaseService;
        private readonly PhotoService _photoService;
        private readonly FaceVerificationService _faceVerificationService;
        private readonly AttendanceService _attendanceService;
        private readonly ILogger<FaceController> _logger;

        public FaceController(
            FirebaseService firebaseService,
            PhotoService photoService,
            FaceVerificationService faceVerificationService,
            AttendanceService attendanceService,
            ILogger<FaceController> logger)
        {
            _firebaseService = firebaseService;
            _photoService = photoService;
            _faceVerificationService = faceVerificationService;
            _attendanceService = attendanceService;
            _logger = logger;
        }

        [HttpPost("enroll")]
        public async Task<IActionResult> Enroll([FromBody] FaceEnrollDto payload)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.UserId) || string.IsNullOrWhiteSpace(payload.ImageBase64))
                return BadRequest(new { message = "UserId e ImageBase64 son requeridos" });

            var (saved, referencePhotoUrl, saveMessage) = await _photoService.GuardarFotoEmpleadoAsync(
                payload.UserId,
                payload.ImageBase64,
                payload.ContentType
            );

            if (!saved)
                return StatusCode(500, new { message = saveMessage });

            var (embOk, embedding, embMsg) = await _faceVerificationService.GenerateEmbeddingAsync(referencePhotoUrl);

            var update = new Dictionary<string, object>
            {
                ["fotoReferenciaUrl"] = referencePhotoUrl,
                ["faceRegistered"] = true,
                ["faceEnrollmentUpdatedAt"] = Timestamp.GetCurrentTimestamp()
            };

            if (embOk && embedding.Count > 0)
            {
                update["faceEmbedding"] = embedding;
                update["faceEmbeddingSize"] = embedding.Count;
                update["faceEmbeddingUpdatedAt"] = Timestamp.GetCurrentTimestamp();
            }
            else
            {
                update["faceEmbedding"] = new List<double>();
                update["faceEmbeddingSize"] = 0;
                update["faceEmbeddingWarning"] = embMsg;
            }

            await _firebaseService.GetCollection("Users").Document(payload.UserId).SetAsync(update, SetOptions.MergeAll);
            await _firebaseService.GetCollection("Employees").Document(payload.UserId).SetAsync(update, SetOptions.MergeAll);

            return Ok(new
            {
                success = true,
                referencePhotoUrl,
                embeddingSaved = embOk && embedding.Count > 0,
                embeddingSize = embedding.Count,
                message = embOk ? "Rostro enrolado correctamente" : "Rostro enrolado; embedding no disponible"
            });
        }

        [HttpPost("verify")]
        public async Task<IActionResult> Verify([FromBody] FaceVerifyDto payload)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.UserId) || string.IsNullOrWhiteSpace(payload.ImageBase64))
                return BadRequest(new { message = "UserId e ImageBase64 son requeridos" });

            var userDoc = await _firebaseService.GetCollection("Users").Document(payload.UserId).GetSnapshotAsync();
            var employeeDoc = await _firebaseService.GetCollection("Employees").Document(payload.UserId).GetSnapshotAsync();

            var storedEmbedding = ExtractEmbedding(userDoc, employeeDoc);

            var (captureSaved, captureUrl, captureMessage) = await _photoService.GuardarCapturaTemporalAsync(
                payload.UserId,
                payload.ImageBase64,
                payload.ContentType
            );

            if (!captureSaved)
                return StatusCode(500, new { message = captureMessage });

            var (captureEmbOk, captureEmbedding, captureEmbMsg) = await _faceVerificationService.GenerateEmbeddingAsync(captureUrl);

            if (storedEmbedding.Count > 0 && captureEmbOk && captureEmbedding.Count > 0 && storedEmbedding.Count == captureEmbedding.Count)
            {
                var score = CosineSimilarity(storedEmbedding, captureEmbedding);
                var matched = score >= payload.Threshold;
                return Ok(new
                {
                    success = true,
                    matched,
                    score,
                    threshold = payload.Threshold,
                    mode = "embedding",
                    message = matched ? "Verificado por embedding" : "No coincide"
                });
            }

            var (hasReference, referenceUrl) = await _photoService.ObtenerFotoEmpleadoAsync(payload.UserId);
            if (!hasReference || string.IsNullOrWhiteSpace(referenceUrl))
            {
                if (!payload.StrictMode)
                {
                    return Ok(new
                    {
                        success = true,
                        matched = true,
                        score = 0,
                        mode = "fallback-no-reference",
                        message = "Foto de referencia no encontrada - acceso permitido (fallback)"
                    });
                }

                return StatusCode(404, new { success = false, matched = false, message = "Foto de referencia no encontrada" });
            }

            var (verified, distance, confidence, verifyMsg) = await _faceVerificationService.VerifyFaceAsync(
                referenceUrl,
                captureUrl,
                0.6,
                allowFallback: !payload.StrictMode
            );

            return Ok(new
            {
                success = true,
                matched = verified,
                score = confidence,
                distance,
                mode = "url-verify",
                message = verifyMsg,
                embeddingMessage = captureEmbMsg
            });
        }

        [HttpPost("check-in")]
        public async Task<IActionResult> FaceCheckIn([FromBody] FaceCheckInDto payload)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.UserId) || string.IsNullOrWhiteSpace(payload.ImageBase64))
                return BadRequest(new { message = "UserId e ImageBase64 son requeridos" });

            var verifyResult = await Verify(new FaceVerifyDto
            {
                UserId = payload.UserId,
                ImageBase64 = payload.ImageBase64,
                ContentType = payload.ContentType,
                Threshold = payload.Threshold,
                StrictMode = payload.StrictMode
            });

            if (verifyResult is ObjectResult objectResult && objectResult.Value is not null)
            {
                var json = System.Text.Json.JsonSerializer.Serialize(objectResult.Value);
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var root = doc.RootElement;
                var matched = root.TryGetProperty("matched", out var m) && m.GetBoolean();

                if (!matched)
                    return StatusCode(403, new { success = false, message = "No se pudo verificar identidad facial" });
            }

            var registered = await _attendanceService.RegistrarAsistenciaAsync(payload.UserId, payload.EventType);
            if (!registered)
                return StatusCode(500, new { success = false, message = "Verificado, pero no se pudo registrar asistencia" });

            return Ok(new
            {
                success = true,
                message = "Rostro verificado y asistencia registrada",
                eventType = string.IsNullOrWhiteSpace(payload.EventType) ? "entrada" : payload.EventType,
                timestamp = DateTime.UtcNow
            });
        }

        private static List<double> ExtractEmbedding(DocumentSnapshot userDoc, DocumentSnapshot employeeDoc)
        {
            if (TryGetEmbeddingFromDoc(userDoc, out var fromUser) && fromUser.Count > 0)
                return fromUser;

            if (TryGetEmbeddingFromDoc(employeeDoc, out var fromEmployee) && fromEmployee.Count > 0)
                return fromEmployee;

            return new List<double>();
        }

        private static bool TryGetEmbeddingFromDoc(DocumentSnapshot doc, out List<double> embedding)
        {
            embedding = new List<double>();
            if (!doc.Exists) return false;

            if (!doc.TryGetValue<object>("faceEmbedding", out var raw) || raw == null)
                return false;

            switch (raw)
            {
                case IEnumerable<object> list:
                    foreach (var item in list)
                    {
                        if (item is double d) embedding.Add(d);
                        else if (item is long l) embedding.Add(l);
                        else if (double.TryParse(item?.ToString(), out var parsed)) embedding.Add(parsed);
                    }
                    break;
                case IEnumerable<double> doubles:
                    embedding = doubles.ToList();
                    break;
            }

            return embedding.Count > 0;
        }

        private static double CosineSimilarity(IReadOnlyList<double> a, IReadOnlyList<double> b)
        {
            double dot = 0;
            double normA = 0;
            double normB = 0;

            for (int i = 0; i < a.Count; i++)
            {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }

            if (normA <= 0 || normB <= 0) return 0;
            return dot / (Math.Sqrt(normA) * Math.Sqrt(normB));
        }
    }
}
