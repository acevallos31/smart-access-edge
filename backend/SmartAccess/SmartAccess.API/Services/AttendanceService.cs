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
        public Dictionary<string, Dictionary<string, object>> TurnosById { get; } = new(StringComparer.OrdinalIgnoreCase);
    }

    public sealed class AttendanceRegistrationResult
    {
        public bool Success { get; init; }
        public string Status { get; init; } = "puntual";
        public string RecordedTime { get; init; } = "--:--";
        public string ScheduledTime { get; init; } = "--:--";
        public string EventType { get; init; } = "entrada";
        public DateTime TimestampUtc { get; init; } = DateTime.UtcNow;
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

    public async Task<AttendanceRegistrationResult> RegistrarAsistenciaAsync(
        string uid,
        string tipoMovimiento,
        IReadOnlyDictionary<string, object>? ubicacion = null,
        string? captureUrl = null)
    {
        try
        {
            var userRef = _firebaseService.GetCollection("Users").Document(uid);
            var snapshot = await userRef.GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return new AttendanceRegistrationResult { Success = false };
            }

            var userData = snapshot.ToDictionary();
            var userName = GetString(userData, "Nombre", "nombre") ?? "Empleado";
            var userEmail = GetString(userData, "Email", "email") ?? string.Empty;

            var employeeData = await FindEmployeeByUidOrEmailAsync(uid, userEmail);
            var departamento = GetString(employeeData, "departamento", "Departamento", "department", "Department") ?? "General";
            var turnoData = await GetTurnoForEmployeeAsync(employeeData);

            var tipoNormalizado = (tipoMovimiento ?? string.Empty).Trim().ToLowerInvariant();
            bool esEntrada = tipoNormalizado is "checkin" or "entrada" or "in";
            string tipoPersistido = esEntrada ? "entrada" : "salida";

            var now = DateTime.UtcNow;
            var shift = ResolveShiftSchedule(employeeData, turnoData, now);
            var scheduled = tipoPersistido.Equals("salida", StringComparison.OrdinalIgnoreCase)
                ? shift.Salida
                : shift.Entrada;
            var recorded = now.ToString("HH:mm");
            var status = ComputeAttendanceStatus(tipoPersistido, scheduled, shift.Entrada, shift.Salida, recorded);

            var locationPayload = BuildLocationPayload(ubicacion);
            var direccion = locationPayload != null
                ? GetString(locationPayload, "direccion", "Direccion")
                : string.Empty;
            var ciudad = locationPayload != null
                ? GetString(locationPayload, "ciudad", "Ciudad")
                : string.Empty;
            var pais = locationPayload != null
                ? GetString(locationPayload, "pais", "Pais")
                : string.Empty;
            var latitud = locationPayload != null
                ? GetString(locationPayload, "lat", "Lat", "latitud", "Latitud")
                : string.Empty;
            var longitud = locationPayload != null
                ? GetString(locationPayload, "lng", "Lng", "longitud", "Longitud")
                : string.Empty;

            Dictionary<string, object> logData = new()
            {
                ["UserId"] = uid,
                ["UserName"] = userName,
                ["Email"] = userEmail,
                ["Departamento"] = departamento,
                ["TurnoId"] = GetString(employeeData, "turnoId", "TurnoId") ?? string.Empty,
                ["TurnoNombre"] = GetString(employeeData, "turnoNombre", "TurnoNombre") ?? GetString(turnoData, "nombre", "Nombre") ?? string.Empty,
                ["ScheduledTime"] = scheduled ?? "--:--",
                ["RecordedTime"] = recorded,
                ["Status"] = status,
                ["Timestamp"] = Timestamp.FromDateTime(now),
                ["Tipo"] = tipoPersistido,
                ["CaptureUrl"] = captureUrl ?? string.Empty,
                ["LugarRegistro"] = direccion ?? string.Empty,
                ["CiudadRegistro"] = ciudad ?? string.Empty,
                ["PaisRegistro"] = pais ?? string.Empty,
                ["LatitudRegistro"] = latitud ?? string.Empty,
                ["LongitudRegistro"] = longitud ?? string.Empty
            };

            if (locationPayload != null)
            {
                logData["Ubicacion"] = locationPayload;
            }

            await _firebaseService.GetCollection("AttendanceLogs").Document().SetAsync(logData);
            await userRef.UpdateAsync("CheckedIn", esEntrada);

            return new AttendanceRegistrationResult
            {
                Success = true,
                Status = status,
                RecordedTime = recorded,
                ScheduledTime = scheduled ?? "--:--",
                EventType = tipoPersistido,
                TimestampUtc = now
            };
        }
        catch
        {
            return new AttendanceRegistrationResult { Success = false };
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

        var turnosSnapshot = await _firebaseService.GetCollection("Turnos").GetSnapshotAsync();
        foreach (var doc in turnosSnapshot.Documents)
        {
            indexes.TurnosById[doc.Id] = doc.ToDictionary();
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

        var turnoData = GetTurnoForEmployee(indexes, employeeData);

        var eventType = NormalizeEventType(GetString(source, "EventType", "eventType", "Tipo", "tipo"));
        var timestamp = GetTimestamp(source, "Timestamp", "timestamp");

        var shift = ResolveShiftSchedule(employeeData, turnoData, timestamp ?? DateTime.UtcNow);

        var scheduled = GetString(source, "ScheduledTime", "scheduledTime")
            ?? (eventType.Equals("salida", StringComparison.OrdinalIgnoreCase) ? shift.Salida : shift.Entrada)
            ?? "--:--";

        var recorded = GetString(source, "RecordedTime", "recordedTime")
            ?? (timestamp != null ? timestamp.Value.ToString("HH:mm") : "--:--");

        var status = GetString(source, "Status", "status")
            ?? ComputeAttendanceStatus(eventType, scheduled, shift.Entrada, shift.Salida, recorded);

        var ubicacion = GetObject(source, "Ubicacion", "ubicacion");
        var lugarRegistro = GetString(source, "LugarRegistro", "lugarRegistro")
            ?? GetString(ubicacion, "direccion", "Direccion")
            ?? string.Empty;
        var ciudadRegistro = GetString(source, "CiudadRegistro", "ciudadRegistro")
            ?? GetString(ubicacion, "ciudad", "Ciudad")
            ?? string.Empty;
        var paisRegistro = GetString(source, "PaisRegistro", "paisRegistro")
            ?? GetString(ubicacion, "pais", "Pais")
            ?? string.Empty;
        var latitudRegistro = GetString(source, "LatitudRegistro", "latitudRegistro")
            ?? GetString(ubicacion, "lat", "Lat", "latitud", "Latitud")
            ?? string.Empty;
        var longitudRegistro = GetString(source, "LongitudRegistro", "longitudRegistro")
            ?? GetString(ubicacion, "lng", "Lng", "longitud", "Longitud")
            ?? string.Empty;

        var departamento = GetString(source, "Departamento", "departamento", "Department", "department")
            ?? GetString(employeeData, "departamento", "Departamento", "department", "Department")
            ?? "General";

        var userName = GetString(source, "UserName", "userName", "Nombre", "nombre")
            ?? GetString(userData, "Nombre", "nombre")
            ?? GetString(employeeData, "nombre", "Nombre")
            ?? "Empleado";

        var turnoId = GetString(employeeData, "turnoId", "TurnoId") ?? string.Empty;
        var turnoNombre = GetString(employeeData, "turnoNombre", "TurnoNombre")
            ?? GetString(turnoData, "nombre", "Nombre")
            ?? string.Empty;

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
            ["turnoId"] = turnoId,
            ["turnoNombre"] = turnoNombre,
            ["timestamp"] = timestamp?.ToString("O") ?? string.Empty,
            ["captureUrl"] = GetString(source, "CaptureUrl", "captureUrl") ?? string.Empty,
            ["lugarRegistro"] = lugarRegistro,
            ["ciudadRegistro"] = ciudadRegistro,
            ["paisRegistro"] = paisRegistro,
            ["latitudRegistro"] = latitudRegistro,
            ["longitudRegistro"] = longitudRegistro
        };
    }

    private static string ComputeAttendanceStatus(
        string eventType,
        string? scheduled,
        string? shiftStart,
        string? shiftEnd,
        string? recorded)
    {
        var tipo = NormalizeEventType(eventType);

        if (!TryParseClock(recorded ?? string.Empty, out var horaRegistrada))
        {
            return "puntual";
        }

        var hasInicio = TryParseClock(shiftStart ?? string.Empty, out var inicioTurno);
        var hasSalida = TryParseClock(shiftEnd ?? string.Empty, out var finTurno);

        if (!hasInicio && !hasSalida && TryParseClock(scheduled ?? string.Empty, out var horaProgramada))
        {
            if (tipo.Equals("entrada", StringComparison.OrdinalIgnoreCase))
            {
                return horaRegistrada > horaProgramada ? "tardanza" : "puntual";
            }

            if (tipo.Equals("salida", StringComparison.OrdinalIgnoreCase))
            {
                if (horaRegistrada > horaProgramada) return "extra";
                if (horaRegistrada < horaProgramada) return "ausente";
            }

            return "puntual";
        }

        if (tipo.Equals("entrada", StringComparison.OrdinalIgnoreCase))
        {
            if (hasInicio && hasSalida && (horaRegistrada < inicioTurno || horaRegistrada > finTurno))
            {
                return "fuera de horario";
            }

            if (hasInicio && horaRegistrada > inicioTurno)
            {
                return "tardanza";
            }

            return "puntual";
        }

        if (tipo.Equals("salida", StringComparison.OrdinalIgnoreCase))
        {
            if (hasSalida && horaRegistrada > finTurno)
            {
                return "extra";
            }

            if (hasSalida && horaRegistrada < finTurno)
            {
                return "ausente";
            }

            return "puntual";
        }

        return "puntual";
    }

    private async Task<Dictionary<string, object>?> GetTurnoForEmployeeAsync(IReadOnlyDictionary<string, object>? employeeData)
    {
        var turnoId = GetString(employeeData, "turnoId", "TurnoId");
        if (string.IsNullOrWhiteSpace(turnoId))
        {
            return null;
        }

        return await FindTurnoByIdAsync(turnoId);
    }

    private static Dictionary<string, object>? GetTurnoForEmployee(LookupIndexes indexes, IReadOnlyDictionary<string, object>? employeeData)
    {
        var turnoId = GetString(employeeData, "turnoId", "TurnoId");
        if (string.IsNullOrWhiteSpace(turnoId))
        {
            return null;
        }

        indexes.TurnosById.TryGetValue(turnoId, out var turnoData);
        return turnoData;
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

    private async Task<Dictionary<string, object>?> FindTurnoByIdAsync(string turnoId)
    {
        var turnoDoc = await _firebaseService.GetCollection("Turnos").Document(turnoId).GetSnapshotAsync();
        return turnoDoc.Exists ? turnoDoc.ToDictionary() : null;
    }

    private sealed class ShiftSchedule
    {
        public string? Entrada { get; init; }
        public string? Salida { get; init; }
    }

    private static ShiftSchedule ResolveShiftSchedule(
        IReadOnlyDictionary<string, object>? employeeData,
        IReadOnlyDictionary<string, object>? turnoData,
        DateTime? referenceTime = null)
    {
        var referencia = referenceTime ?? DateTime.UtcNow;

        var turnoSchedule = ResolveScheduleFromTurno(turnoData, referencia);
        if (turnoSchedule != null)
        {
            return turnoSchedule;
        }

        if (employeeData == null)
        {
            return new ShiftSchedule();
        }

        var entrada = GetString(employeeData, "horarioEntrada", "HorarioEntrada");
        var salida = GetString(employeeData, "horarioSalida", "HorarioSalida");

        var horarioObj = GetObject(employeeData, "horario", "Horario");
        if (horarioObj != null)
        {
            entrada ??= GetString(horarioObj, "entrada", "Entrada");
            salida ??= GetString(horarioObj, "salida", "Salida");
        }

        return new ShiftSchedule
        {
            Entrada = entrada,
            Salida = salida
        };
    }

    private static ShiftSchedule? ResolveScheduleFromTurno(
        IReadOnlyDictionary<string, object>? turnoData,
        DateTime referenceTime)
    {
        if (turnoData == null) return null;

        var dayKey = referenceTime.DayOfWeek switch
        {
            DayOfWeek.Monday => "lunes",
            DayOfWeek.Tuesday => "martes",
            DayOfWeek.Wednesday => "miercoles",
            DayOfWeek.Thursday => "jueves",
            DayOfWeek.Friday => "viernes",
            DayOfWeek.Saturday => "sabado",
            _ => "domingo"
        };

        var diaObj = GetObject(turnoData, dayKey);
        if (diaObj == null) return null;

        var trabajaRaw = GetString(diaObj, "trabaja", "Trabaja");
        if (!string.Equals(trabajaRaw, "true", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return new ShiftSchedule
        {
            Entrada = GetString(diaObj, "entrada", "Entrada"),
            Salida = GetString(diaObj, "salida", "Salida")
        };
    }

    private static string NormalizeEventType(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        return normalized is "salida" or "checkout" or "out" ? "salida" : "entrada";
    }

    private static string ComputeStatus(
        string eventType,
        string? scheduledTime,
        string? shiftStart,
        string? shiftEnd,
        string recordedTime)
    {
        if (!TryParseClock(recordedTime, out var recorded))
        {
            return "puntual";
        }

        var tolerance = TimeSpan.FromMinutes(5);
        var isSalida = eventType.Equals("salida", StringComparison.OrdinalIgnoreCase);

        var hasEntrada = TryParseClock(shiftStart ?? string.Empty, out var entradaTurno);
        var hasSalida = TryParseClock(shiftEnd ?? string.Empty, out var salidaTurno);

        if (!hasEntrada || !hasSalida)
        {
            if (!TryParseClock(scheduledTime ?? string.Empty, out var scheduledFallback))
            {
                return "fuera_horario";
            }

            if (!isSalida && recorded > scheduledFallback.Add(tolerance))
            {
                return "tardanza";
            }

            if (isSalida && recorded < scheduledFallback.Subtract(tolerance))
            {
                return "ausente";
            }

            if (isSalida && recorded > scheduledFallback.Add(tolerance))
            {
                return "extra";
            }

            return "puntual";
        }

        if (!isSalida)
        {
            if (recorded > salidaTurno.Add(tolerance))
            {
                return "fuera_horario";
            }

            if (recorded > entradaTurno.Add(tolerance))
            {
                return "tardanza";
            }

            return "puntual";
        }

        if (recorded < entradaTurno.Subtract(tolerance))
        {
            return "fuera_horario";
        }

        if (recorded < salidaTurno.Subtract(tolerance))
        {
            return "ausente";
        }

        if (recorded > salidaTurno.Add(tolerance))
        {
            return "extra";
        }

        return "puntual";
    }

    private static Dictionary<string, object>? BuildLocationPayload(IReadOnlyDictionary<string, object>? ubicacion)
    {
        if (ubicacion == null)
        {
            return null;
        }

        var dict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in ubicacion)
        {
            dict[kv.Key] = kv.Value ?? string.Empty;
        }

        return dict.Count == 0 ? null : dict;
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
