using Google.Cloud.Firestore;

namespace SmartAccess.API.Services;

public class AttendanceService
{
    private readonly FirebaseService _firebaseService;
    private readonly ILogger<AttendanceService> _logger;

    public AttendanceService(FirebaseService firebaseService, ILogger<AttendanceService> logger)
    {
        _firebaseService = firebaseService ?? throw new ArgumentNullException(nameof(firebaseService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Obtiene todos los registros de asistencia de la base de datos
    /// </summary>
    public async Task<List<Dictionary<string, object>>> ObtenerTodosAsync()
    {
        try
        {
            var snapshot = await _firebaseService.GetCollection("AttendanceLogs")
                .OrderByDescending("Timestamp")
                .Limit(500)
                .GetSnapshotAsync();

            var registros = new List<Dictionary<string, object>>();
            foreach (var doc in snapshot.Documents)
            {
                var data = doc.ToDictionary();
                data["id"] = doc.Id;
                registros.Add(data);
            }
            return registros;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error obteniendo todos los registros");
            return new List<Dictionary<string, object>>();
        }
    }

    /// <summary>
    /// Obtiene registros de asistencia del día actual
    /// </summary>
    public async Task<List<Dictionary<string, object>>> ObtenerDelDiaAsync()
    {
        try
        {
            var ahora = Timestamp.GetCurrentTimestamp();
            var hoy = ahora.ToDateTime().Date;
            var inicioDelDia = Timestamp.FromDateTime(hoy.ToUniversalTime());
            var finDelDia = Timestamp.FromDateTime(hoy.AddDays(1).ToUniversalTime());

            var snapshot = await _firebaseService.GetCollection("AttendanceLogs")
                .WhereGreaterThanOrEqualTo("Timestamp", inicioDelDia)
                .WhereLessThan("Timestamp", finDelDia)
                .OrderByDescending("Timestamp")
                .GetSnapshotAsync();

            var registros = new List<Dictionary<string, object>>();
            foreach (var doc in snapshot.Documents)
            {
                var data = doc.ToDictionary();
                data["id"] = doc.Id;
                registros.Add(data);
            }
            return registros;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error obteniendo registros del día");
            return new List<Dictionary<string, object>>();
        }
    }

    /// <summary>
    /// Obtiene registros de asistencia de un usuario específico
    /// </summary>
    public async Task<List<Dictionary<string, object>>> ObtenerPorUsuarioAsync(string userId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId))
                return new List<Dictionary<string, object>>();

            var snapshot = await _firebaseService.GetCollection("AttendanceLogs")
                .WhereEqualTo("UserId", userId)
                .OrderByDescending("Timestamp")
                .Limit(100)
                .GetSnapshotAsync();

            var registros = new List<Dictionary<string, object>>();
            foreach (var doc in snapshot.Documents)
            {
                var data = doc.ToDictionary();
                data["id"] = doc.Id;
                registros.Add(data);
            }
            return registros;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error obteniendo registros del usuario {UserId}", userId);
            return new List<Dictionary<string, object>>();
        }
    }

    /// <summary>
    /// Obtiene un registro específico por ID
    /// </summary>
    public async Task<Dictionary<string, object>?> ObtenerPorIdAsync(string recordId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(recordId))
                return null;

            var doc = await _firebaseService.GetCollection("AttendanceLogs").Document(recordId).GetSnapshotAsync();
            if (!doc.Exists)
                return null;

            var data = doc.ToDictionary();
            data["id"] = doc.Id;
            return data;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error obteniendo registro {RecordId}", recordId);
            return null;
        }
    }

    /// <summary>
    /// Verifica si un usuario ya registró asistencia hoy
    /// </summary>
    public async Task<bool> YaRegistroHoyAsync(string userId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId))
                return false;

            var ahora = Timestamp.GetCurrentTimestamp();
            var hoy = ahora.ToDateTime().Date;
            var inicioDelDia = Timestamp.FromDateTime(hoy.ToUniversalTime());
            var finDelDia = Timestamp.FromDateTime(hoy.AddDays(1).ToUniversalTime());

            var snapshot = await _firebaseService.GetCollection("AttendanceLogs")
                .WhereEqualTo("UserId", userId)
                .WhereGreaterThanOrEqualTo("Timestamp", inicioDelDia)
                .WhereLessThan("Timestamp", finDelDia)
                .Limit(1)
                .GetSnapshotAsync();

            return snapshot.Count > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verificando registro de hoy para {UserId}", userId);
            return false;
        }
    }

    /// <summary>
    /// Obtiene el último registro de un usuario
    /// </summary>
    public async Task<Dictionary<string, object>?> ObtenerUltimoRegistroAsync(string userId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId))
                return null;

            var snapshot = await _firebaseService.GetCollection("AttendanceLogs")
                .WhereEqualTo("UserId", userId)
                .OrderByDescending("Timestamp")
                .Limit(1)
                .GetSnapshotAsync();

            if (snapshot.Count == 0)
                return null;

            var data = snapshot.Documents[0].ToDictionary();
            data["id"] = snapshot.Documents[0].Id;
            return data;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error obteniendo último registro para {UserId}", userId);
            return null;
        }
    }

    public async Task<bool> RegistrarAsistenciaAsync(string uid, string tipoMovimiento)
    {
        try
        {
            var userRef = _firebaseService.GetCollection("Users").Document(uid);
            var snapshot = await userRef.GetSnapshotAsync();

            if (!snapshot.Exists) return false;

            bool nuevoEstado = string.Equals(tipoMovimiento, "CheckIn", StringComparison.OrdinalIgnoreCase);

            Dictionary<string, object> logData = new()
            {
                ["UserId"] = uid,
                ["Timestamp"] = Timestamp.GetCurrentTimestamp(),
                ["Tipo"] = tipoMovimiento
            };

            await _firebaseService.GetCollection("AttendanceLogs").Document().SetAsync(logData);
            await userRef.UpdateAsync("CheckedIn", nuevoEstado);

            return true;
        }
        catch
        {
            return false;
        }
    }
}
