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

    private sealed class LookupIndexes
    {
        public Dictionary<string, Dictionary<string, object>> UsersById { get; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, Dictionary<string, object>> EmployeesByUserId { get; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, Dictionary<string, object>> EmployeesByEmail { get; } = new(StringComparer.OrdinalIgnoreCase);
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

            var indexes = await BuildLookupIndexesAsync();
            return snapshot.Documents
                .Select(doc => EnrichAttendanceRecord(doc, indexes))
                .ToList();
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

            var indexes = await BuildLookupIndexesAsync();
            return snapshot.Documents
                .Select(doc => EnrichAttendanceRecord(doc, indexes))
                .ToList();
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

            var indexes = await BuildLookupIndexesAsync();

            return snapshot.Documents
                .OrderByDescending(d =>
                {
                    d.TryGetValue<Timestamp>("Timestamp", out var ts);
                    return ts.ToDateTime();
                })
                .Select(d => EnrichAttendanceRecord(d, indexes))
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

            var indexes = await BuildLookupIndexesAsync();
            return EnrichAttendanceRecord(doc, indexes);
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

            var userData = snapshot.ToDictionary();
            var userName = GetString(userData, "Nombre", "nombre") ?? "Empleado";
            var userEmail = GetString(userData, "Email", "email") ?? string.Empty;

            var employeeData = await FindEmployeeByUidOrEmailAsync(uid, userEmail);
            var departamento = GetString(employeeData, "departamento", "Departamento", "department", "Department") ?? "General";
            var horarioEntrada = ResolveSchedule(employeeData, "entrada") ?? "08:00";
            var horarioSalida = ResolveSchedule(employeeData, "salida") ?? "17:00";

            var tipoNormalizado = (tipoMovimiento ?? string.Empty).Trim().ToLowerInvariant();
            bool esEntrada = tipoNormalizado is "checkin" or "entrada" or "in";
            string tipoPersistido = esEntrada ? "entrada" : "salida";

            var now = DateTime.UtcNow;
            var scheduled = esEntrada ? horarioEntrada : horarioSalida;
            var recorded = now.ToString("HH:mm");
            var status = ComputeStatus(tipoPersistido, scheduled, recorded);

            Dictionary<string, object> logData = new()
            {
                ["UserId"] = uid,
                ["UserName"] = userName,
                ["Email"] = userEmail,
                ["Departamento"] = departamento,
                ["ScheduledTime"] = scheduled,
                ["RecordedTime"] = recorded,
                ["Status"] = status,
                ["Timestamp"] = Timestamp.FromDateTime(now),
                ["Tipo"] = tipoPersistido
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

    private async Task<LookupIndexes> BuildLookupIndexesAsync()
    {
        var indexes = new LookupIndexes();

        var usersSnapshot = await _firebaseService.GetCollection("Users").GetSnapshotAsync();
        foreach (var doc in usersSnapshot.Documents)
        {
            indexes.UsersById[doc.Id] = doc.ToDictionary();
        }

        var employeesSnapshot = await _firebaseService.GetCollection("Employees").GetSnapshotAsync();
        foreach (var doc in employeesSnapshot.Documents)
        {
            var data = doc.ToDictionary();

            var userId = GetString(data, "userId", "UserId", "uid", "Uid");
            if (!string.IsNullOrWhiteSpace(userId))
            {
                indexes.EmployeesByUserId[userId] = data;
            }

            if (!indexes.EmployeesByUserId.ContainsKey(doc.Id))
            {
                indexes.EmployeesByUserId[doc.Id] = data;
            }

            var email = GetString(data, "email", "Email");
            if (!string.IsNullOrWhiteSpace(email))
            {
                indexes.EmployeesByEmail[email] = data;
            }
        }

        return indexes;
    }

    private Dictionary<string, object> EnrichAttendanceRecord(DocumentSnapshot doc, LookupIndexes indexes)
    {
        var source = doc.ToDictionary();
        var userId = GetString(source, "UserId", "userId") ?? string.Empty;

        indexes.UsersById.TryGetValue(userId, out var userData);

        Dictionary<string, object>? employeeData = null;
        if (!string.IsNullOrWhiteSpace(userId))
        {
            indexes.EmployeesByUserId.TryGetValue(userId, out employeeData);
        }

        var email = GetString(source, "Email", "email")
            ?? GetString(userData, "Email", "email")
            ?? string.Empty;

        if (employeeData == null && !string.IsNullOrWhiteSpace(email))
        {
            indexes.EmployeesByEmail.TryGetValue(email, out employeeData);
        }

        var eventType = NormalizeEventType(GetString(source, "EventType", "eventType", "Tipo", "tipo"));
        var timestamp = GetTimestamp(source, "Timestamp", "timestamp");

        var scheduled = GetString(source, "ScheduledTime", "scheduledTime")
            ?? ResolveSchedule(employeeData, eventType)
            ?? "--:--";

        var recorded = GetString(source, "RecordedTime", "recordedTime")
            ?? (timestamp != null ? timestamp.Value.ToString("HH:mm") : "--:--");

        var status = GetString(source, "Status", "status")
            ?? ComputeStatus(eventType, scheduled, recorded);

        var departamento = GetString(source, "Departamento", "departamento", "Department", "department")
            ?? GetString(employeeData, "departamento", "Departamento", "department", "Department")
            ?? "General";

        var userName = GetString(source, "UserName", "userName", "Nombre", "nombre")
            ?? GetString(userData, "Nombre", "nombre")
            ?? GetString(employeeData, "nombre", "Nombre")
            ?? "Empleado";

        return new Dictionary<string, object>
        {
            ["id"] = doc.Id,
            ["userId"] = userId,
            ["userName"] = userName,
            ["employeeId"] = userId,
            ["departamento"] = departamento,
            ["department"] = departamento,
            ["eventType"] = eventType,
            ["scheduledTime"] = scheduled,
            ["recordedTime"] = recorded,
            ["status"] = status,
            ["timestamp"] = timestamp?.ToString("O") ?? string.Empty,
            ["captureUrl"] = GetString(source, "CaptureUrl", "captureUrl") ?? string.Empty
        };
    }

    private async Task<Dictionary<string, object>?> FindEmployeeByUidOrEmailAsync(string uid, string? email)
    {
        var employees = await _firebaseService.GetCollection("Employees").GetSnapshotAsync();

        foreach (var doc in employees.Documents)
        {
            var data = doc.ToDictionary();
            var userId = GetString(data, "userId", "UserId", "uid", "Uid");
            if (!string.IsNullOrWhiteSpace(userId) && userId.Equals(uid, StringComparison.OrdinalIgnoreCase))
            {
                return data;
            }

            if (doc.Id.Equals(uid, StringComparison.OrdinalIgnoreCase))
            {
                return data;
            }

            var employeeEmail = GetString(data, "email", "Email");
            if (!string.IsNullOrWhiteSpace(email) &&
                !string.IsNullOrWhiteSpace(employeeEmail) &&
                employeeEmail.Equals(email, StringComparison.OrdinalIgnoreCase))
            {
                return data;
            }
        }

        return null;
    }

    private static string? ResolveSchedule(IReadOnlyDictionary<string, object>? employeeData, string eventType)
    {
        if (employeeData == null) return null;

        var byKey = eventType.Equals("salida", StringComparison.OrdinalIgnoreCase)
            ? GetString(employeeData, "horarioSalida", "HorarioSalida")
            : GetString(employeeData, "horarioEntrada", "HorarioEntrada");

        if (!string.IsNullOrWhiteSpace(byKey)) return byKey;

        var horarioObj = GetObject(employeeData, "horario", "Horario");
        if (horarioObj != null)
        {
            var nested = eventType.Equals("salida", StringComparison.OrdinalIgnoreCase)
                ? GetString(horarioObj, "salida", "Salida")
                : GetString(horarioObj, "entrada", "Entrada");

            if (!string.IsNullOrWhiteSpace(nested)) return nested;
        }

        return null;
    }

    private static string NormalizeEventType(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        return normalized is "salida" or "checkout" or "out" ? "salida" : "entrada";
    }

    private static string ComputeStatus(string eventType, string scheduledTime, string recordedTime)
    {
        if (!TryParseClock(scheduledTime, out var scheduled) || !TryParseClock(recordedTime, out var recorded))
        {
            return "puntual";
        }

        if (eventType.Equals("entrada", StringComparison.OrdinalIgnoreCase) && recorded > scheduled)
        {
            return "tardanza";
        }

        return "puntual";
    }

    private static bool TryParseClock(string value, out TimeSpan time)
    {
        return TimeSpan.TryParse(value, out time);
    }

    private static DateTime? GetTimestamp(IReadOnlyDictionary<string, object>? source, params string[] keys)
    {
        if (source == null) return null;

        foreach (var key in keys)
        {
            if (!source.TryGetValue(key, out var raw) || raw == null)
            {
                continue;
            }

            if (raw is Timestamp ts)
            {
                return ts.ToDateTime();
            }

            if (raw is DateTime dt)
            {
                return dt;
            }

            if (DateTime.TryParse(raw.ToString(), out var parsed))
            {
                return parsed;
            }
        }

        return null;
    }

    private static Dictionary<string, object>? GetObject(IReadOnlyDictionary<string, object>? source, params string[] keys)
    {
        if (source == null) return null;

        foreach (var key in keys)
        {
            if (!source.TryGetValue(key, out var raw) || raw == null)
            {
                continue;
            }

            if (raw is Dictionary<string, object> dict)
            {
                return dict;
            }

            if (raw is IReadOnlyDictionary<string, object> readOnly)
            {
                return readOnly.ToDictionary(k => k.Key, v => v.Value);
            }
        }

        return null;
    }

    private static string? GetString(IReadOnlyDictionary<string, object>? source, params string[] keys)
    {
        if (source == null) return null;

        foreach (var key in keys)
        {
            if (source.TryGetValue(key, out var raw) && raw != null)
            {
                var text = raw.ToString()?.Trim();
                if (!string.IsNullOrWhiteSpace(text))
                {
                    return text;
                }
            }
        }

        return null;
    }
}
