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
            var usersCache = new Dictionary<string, (string nombre, string departamento)>();
            foreach (var doc in snapshot.Documents)
            {
                var data = doc.ToDictionary();
                data["id"] = doc.Id;

                var userId = data.TryGetValue("UserId", out var userIdObj)
                    ? userIdObj?.ToString() ?? string.Empty
                    : string.Empty;

                var eventType = data.TryGetValue("EventType", out var eventTypeObj)
                    ? (eventTypeObj?.ToString() ?? string.Empty)
                    : (data.TryGetValue("Tipo", out var tipoObj) ? (tipoObj?.ToString() ?? string.Empty) : string.Empty);

                if (string.Equals(eventType, "checkin", StringComparison.OrdinalIgnoreCase) || string.Equals(eventType, "in", StringComparison.OrdinalIgnoreCase))
                    eventType = "entrada";
                if (string.Equals(eventType, "checkout", StringComparison.OrdinalIgnoreCase) || string.Equals(eventType, "out", StringComparison.OrdinalIgnoreCase))
                    eventType = "salida";

                var status = data.TryGetValue("Status", out var statusObj)
                    ? statusObj?.ToString() ?? "puntual"
                    : "puntual";

                var scheduledTime = data.TryGetValue("ScheduledTime", out var scheduledObj)
                    ? scheduledObj?.ToString() ?? "--:--"
                    : "--:--";

                var recordedTime = "--:--";
                if (data.TryGetValue("Timestamp", out var tsObj) && tsObj is Timestamp ts)
                    recordedTime = ts.ToDateTime().ToLocalTime().ToString("HH:mm");

                var (nombre, departamento) = await ObtenerUsuarioCacheadoAsync(userId, usersCache);

                registros.Add(new Dictionary<string, object>
                {
                    ["id"] = doc.Id,
                    ["userId"] = userId,
                    ["userName"] = nombre,
                    ["employeeId"] = userId,
                    ["departamento"] = departamento,
                    ["department"] = departamento,
                    ["eventType"] = string.IsNullOrWhiteSpace(eventType) ? "entrada" : eventType,
                    ["scheduledTime"] = scheduledTime,
                    ["recordedTime"] = recordedTime,
                    ["status"] = string.IsNullOrWhiteSpace(status) ? "puntual" : status,
                    ["timestamp"] = data.TryGetValue("Timestamp", out var rawTimestamp) ? rawTimestamp : Timestamp.GetCurrentTimestamp()
                });
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

            // Query simple por UserId, ordena en memoria (no requiere índice compuesto)
            var snapshot = await _firebaseService.GetCollection("AttendanceLogs")
                .WhereEqualTo("UserId", userId)
                .Limit(100)
                .GetSnapshotAsync();

            return snapshot.Documents
                .OrderByDescending(d =>
                {
                    d.TryGetValue<Timestamp>("Timestamp", out var ts);
                    return ts.ToDateTime();
                })
                .Select(d =>
                {
                    var data = d.ToDictionary();
                    data["id"] = d.Id;
                    return data;
                })
                .ToList();
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

            var hoy = DateTime.UtcNow.Date;
            var inicioUtc = hoy;
            var finUtc = hoy.AddDays(1);

            // Query simple por UserId (no requiere índice compuesto), filtro en memoria
            var snapshot = await _firebaseService.GetCollection("AttendanceLogs")
                .WhereEqualTo("UserId", userId)
                .Limit(200)
                .GetSnapshotAsync();

            return snapshot.Documents.Any(d =>
            {
                if (!d.TryGetValue<Timestamp>("Timestamp", out var ts)) return false;
                var dt = ts.ToDateTime();
                return dt >= inicioUtc && dt < finUtc;
            });
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

            // Query simple por UserId, ordena en memoria (no requiere índice compuesto)
            var snapshot = await _firebaseService.GetCollection("AttendanceLogs")
                .WhereEqualTo("UserId", userId)
                .Limit(200)
                .GetSnapshotAsync();

            if (snapshot.Count == 0) return null;

            var ultimo = snapshot.Documents
                .OrderByDescending(d =>
                {
                    d.TryGetValue<Timestamp>("Timestamp", out var ts);
                    return ts.ToDateTime();
                })
                .First();

            var data = ultimo.ToDictionary();
            data["id"] = ultimo.Id;
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

            var tipoNormalizado = (tipoMovimiento ?? string.Empty).Trim().ToLowerInvariant();
            bool esEntrada = tipoNormalizado is "checkin" or "entrada" or "in";
            string tipoPersistido = esEntrada ? "entrada" : "salida";

            var userData = snapshot.ToDictionary();
            var userName = userData.TryGetValue("Nombre", out var nombreObj) ? nombreObj?.ToString() ?? "Empleado" : "Empleado";
            var userEmail = userData.TryGetValue("Email", out var emailObj) ? emailObj?.ToString() ?? string.Empty : string.Empty;

            string departamento = "General";
            var employeeDoc = await _firebaseService.GetCollection("Employees").Document(uid).GetSnapshotAsync();
            if (employeeDoc.Exists && employeeDoc.TryGetValue<string>("departamento", out var depto) && !string.IsNullOrWhiteSpace(depto))
                departamento = depto;

            Dictionary<string, object> logData = new()
            {
                ["UserId"] = uid,
                ["Timestamp"] = Timestamp.GetCurrentTimestamp(),
                ["Tipo"] = tipoPersistido,
                ["EventType"] = tipoPersistido,
                ["UserName"] = userName,
                ["Email"] = userEmail,
                ["Departamento"] = departamento,
                ["Department"] = departamento,
                ["Status"] = "puntual"
            };

            await _firebaseService.GetCollection("AttendanceLogs").Document().SetAsync(logData);
            await userRef.UpdateAsync("CheckedIn", esEntrada);

            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task<(string nombre, string departamento)> ObtenerUsuarioCacheadoAsync(
        string userId,
        Dictionary<string, (string nombre, string departamento)> cache)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return ("Empleado", "General");

        if (cache.TryGetValue(userId, out var cached))
            return cached;

        string nombre = userId;
        string departamento = "General";

        var userDoc = await _firebaseService.GetCollection("Users").Document(userId).GetSnapshotAsync();
        if (userDoc.Exists)
        {
            if (userDoc.TryGetValue<string>("Nombre", out var nombreDb) && !string.IsNullOrWhiteSpace(nombreDb))
                nombre = nombreDb;
        }

        var employeeDoc = await _firebaseService.GetCollection("Employees").Document(userId).GetSnapshotAsync();
        if (employeeDoc.Exists)
        {
            if (employeeDoc.TryGetValue<string>("departamento", out var deptoDb) && !string.IsNullOrWhiteSpace(deptoDb))
                departamento = deptoDb;
        }

        cache[userId] = (nombre, departamento);
        return (nombre, departamento);
    }
}
