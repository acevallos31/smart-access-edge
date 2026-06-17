using Google.Cloud.Firestore;

namespace SmartAccess.API.Services
{
    public class ReportService
    {
        private readonly FirebaseService _firebaseService;
        private readonly AttendanceService _attendanceService;
        private readonly ILogger<ReportService> _logger;

        public ReportService(
            FirebaseService firebaseService,
            AttendanceService attendanceService,
            ILogger<ReportService> logger)
        {
            _firebaseService = firebaseService ?? throw new ArgumentNullException(nameof(firebaseService));
            _attendanceService = attendanceService ?? throw new ArgumentNullException(nameof(attendanceService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<List<Dictionary<string, object>>> GetAttendanceReportByUserAsync(
            string uid,
            string? desde = null,
            string? hasta = null)
        {
            try
            {
                var registros = await _attendanceService.ObtenerPorUsuarioAsync(uid);
                var (inicio, fin, _, _) = ResolveRange("mes", desde, hasta);

                return registros
                    .Where(r => IsInRange(ToDateTime(r), inicio, fin))
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo reporte del usuario {Uid}", uid);
                return new List<Dictionary<string, object>>();
            }
        }

        /// <summary>
        /// Devuelve el modelo AttendanceStatistics que espera el frontend Angular.
        /// Todos los filtros de rango de fechas se hacen en memoria para evitar índices compuestos.
        /// </summary>
        public async Task<Dictionary<string, object>> GetStatisticsAsync(
            string periodo = "semana",
            string? desde = null,
            string? hasta = null)
        {
            try
            {
                var (inicio, fin, periodoAplicado, custom) = ResolveRange(periodo, desde, hasta);

                var employeesSnap = await _firebaseService.GetCollection("Employees")
                    .WhereEqualTo("activo", true)
                    .GetSnapshotAsync();
                int totalEmployees = employeesSnap.Count;

                var allLogs = await _attendanceService.ObtenerTodosAsync();
                var logsRango = allLogs
                    .Where(d => IsInRange(ToDateTime(d), inicio, fin))
                    .ToList();

                var uniqueIds = logsRango
                    .Select(r => ReadString(r, "userId", "UserId"))
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Distinct().ToList();

                int presentes  = uniqueIds.Count;
                int tardanzas  = logsRango.Count(r =>
                    string.Equals(ReadString(r, "status", "Status"), "tardanza", StringComparison.OrdinalIgnoreCase));
                int ausentes   = Math.Max(0, totalEmployees - presentes);
                double pct     = totalEmployees > 0 ? Math.Round((double)presentes / totalEmployees * 100, 2) : 0;

                var deptStats  = BuildDeptStats(employeesSnap, logsRango);
                var tendencia  = BuildTendencia(allLogs, totalEmployees, inicio, fin);

                return new Dictionary<string, object>
                {
                    ["totalEmpleados"]       = totalEmployees,
                    ["presentes"]            = presentes,
                    ["registrosHoy"]         = logsRango.Count,
                    ["tardanzas"]            = tardanzas,
                    ["ausentes"]             = ausentes,
                    ["porcentajeAsistencia"] = pct,
                    ["porDepartamento"]      = deptStats,
                    ["tendenciaSemanal"]     = tendencia,
                    ["tendencia"]            = tendencia,
                    ["periodoAplicado"]      = periodoAplicado,
                    ["desde"]                = inicio.ToString("yyyy-MM-dd"),
                    ["hasta"]                = fin.AddDays(-1).ToString("yyyy-MM-dd"),
                    ["customRange"]          = custom
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo estadísticas");
                return new Dictionary<string, object>
                {
                    ["totalEmpleados"]       = 0,
                    ["presentes"]            = 0,
                    ["registrosHoy"]         = 0,
                    ["tardanzas"]            = 0,
                    ["ausentes"]             = 0,
                    ["porcentajeAsistencia"] = 0.0,
                    ["porDepartamento"]      = new List<object>(),
                    ["tendenciaSemanal"]     = new List<object>(),
                    ["tendencia"]            = new List<object>(),
                    ["periodoAplicado"]      = "semana",
                    ["desde"]                = string.Empty,
                    ["hasta"]                = string.Empty,
                    ["customRange"]          = false
                };
            }
        }

        public async Task<List<Dictionary<string, object>>> GetStatisticsByDepartmentAsync(
            string periodo = "semana",
            string? desde = null,
            string? hasta = null)
        {
            var (inicio, fin, _, _) = ResolveRange(periodo, desde, hasta);

            var employeesSnap = await _firebaseService.GetCollection("Employees")
                .WhereEqualTo("activo", true)
                .GetSnapshotAsync();

            var allLogs = await _attendanceService.ObtenerTodosAsync();

            var logsRango = allLogs
                .Where(d => IsInRange(ToDateTime(d), inicio, fin))
                .ToList();

            return BuildDeptStats(employeesSnap, logsRango);
        }

        public async Task<List<Dictionary<string, object>>> GetDetailedRecordsAsync(
            string periodo = "semana",
            string? desde = null,
            string? hasta = null,
            string? departamento = null,
            string? userId = null,
            string? turnoId = null)
        {
            var (inicio, fin, _, _) = ResolveRange(periodo, desde, hasta);

            var records = await _attendanceService.ObtenerTodosAsync();

            return records
                .Where(r => IsInRange(ToDateTime(r), inicio, fin))
                .Where(r => string.IsNullOrWhiteSpace(departamento) ||
                            string.Equals(ReadString(r, "departamento", "Departamento"), departamento, StringComparison.OrdinalIgnoreCase))
                .Where(r => string.IsNullOrWhiteSpace(userId) ||
                            string.Equals(ReadString(r, "userId", "UserId"), userId, StringComparison.OrdinalIgnoreCase))
                .Where(r => string.IsNullOrWhiteSpace(turnoId) ||
                            string.Equals(ReadString(r, "turnoId", "TurnoId"), turnoId, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(ToDateTime)
                .ToList();
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private static List<Dictionary<string, object>> BuildDeptStats(
            QuerySnapshot employeesSnap,
            List<Dictionary<string, object>> logsRango)
        {
            var departments = new Dictionary<string, Dictionary<string, object>>();
            var userDeptMap = new Dictionary<string, string>();

            foreach (var doc in employeesSnap.Documents)
            {
                var data = doc.ToDictionary();
                string dept = data.TryGetValue("departamento", out var d)
                    ? d?.ToString() ?? "Sin Departamento" : "Sin Departamento";

                if (!departments.ContainsKey(dept))
                    departments[dept] = new Dictionary<string, object>
                    {
                        ["departamento"] = dept, ["total"] = 0,
                        ["presentes"] = 0, ["tardanzas"] = 0,
                        ["ausentes"] = 0, ["porcentaje"] = 0.0
                    };

                departments[dept]["total"] = (int)departments[dept]["total"] + 1;

                // Mapeo userId → departamento para cruzar con logs sin query extra
                string? uId = data.TryGetValue("userId", out var u1) ? u1?.ToString() :
                              data.TryGetValue("UserId", out var u2) ? u2?.ToString() : null;
                if (!string.IsNullOrWhiteSpace(uId)) userDeptMap[uId] = dept;
            }

            var counted = new Dictionary<string, HashSet<string>>();
            foreach (var log in logsRango)
            {
                var userId = ReadString(log, "userId", "UserId");
                if (string.IsNullOrWhiteSpace(userId)) continue;
                if (!userDeptMap.TryGetValue(userId, out var dept)) continue;
                if (!departments.ContainsKey(dept)) continue;
                if (!counted.TryGetValue(dept, out var set)) { set = new HashSet<string>(); counted[dept] = set; }
                if (set.Add(userId))
                    departments[dept]["presentes"] = (int)departments[dept]["presentes"] + 1;
            }

            foreach (var dept in departments.Values)
            {
                int total = (int)dept["total"], presentes = (int)dept["presentes"];
                dept["ausentes"]   = Math.Max(0, total - presentes);
                dept["porcentaje"] = total > 0 ? Math.Round((double)presentes / total * 100, 2) : 0.0;
            }

            return departments.Values.ToList();
        }

        private static List<Dictionary<string, object>> BuildTendencia(
            List<Dictionary<string, object>> allLogs,
            int totalEmployees,
            DateTime inicio,
            DateTime fin)
        {
            var result = new List<Dictionary<string, object>>();
            var diaCursor = inicio.Date;
            while (diaCursor < fin.Date)
            {
                var diaFin = diaCursor.AddDays(1);
                int presDay = allLogs
                    .Where(d => IsInRange(ToDateTime(d), diaCursor, diaFin))
                    .Select(d => ReadString(d, "userId", "UserId"))
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Distinct().Count();

                result.Add(new Dictionary<string, object>
                {
                    ["fecha"]      = diaCursor.ToString("dd/MM"),
                    ["porcentaje"] = totalEmployees > 0 ? Math.Round((double)presDay / totalEmployees * 100) : 0.0,
                    ["presentes"]  = presDay
                });

                diaCursor = diaCursor.AddDays(1);
            }
            return result;
        }

        private static (DateTime Inicio, DateTime Fin, string PeriodoAplicado, bool Custom)
            ResolveRange(string? periodo, string? desde, string? hasta)
        {
            var now = DateTime.UtcNow;
            var today = now.Date;

            if (!string.IsNullOrWhiteSpace(desde) && DateTime.TryParse(desde, out var dDesde) &&
                !string.IsNullOrWhiteSpace(hasta) && DateTime.TryParse(hasta, out var dHasta))
            {
                var inicioCustom = dDesde.Date;
                var finCustom = dHasta.Date.AddDays(1);
                return (inicioCustom, finCustom <= inicioCustom ? inicioCustom.AddDays(1) : finCustom, "custom", true);
            }

            var p = (periodo ?? "semana").Trim().ToLowerInvariant();
            if (p == "mes")
            {
                var inicio = new DateTime(today.Year, today.Month, 1);
                var fin = today.AddDays(1);
                return (inicio, fin, "mes", false);
            }

            var inicioSemana = today.AddDays(-6);
            var finSemana = today.AddDays(1);
            return (inicioSemana, finSemana, "semana", false);
        }

        private static bool IsInRange(DateTime dateTime, DateTime inicio, DateTime fin)
        {
            return dateTime >= inicio && dateTime < fin;
        }

        private static DateTime ToDateTime(IReadOnlyDictionary<string, object> row)
        {
            var str = ReadString(row, "timestamp", "Timestamp");
            if (DateTime.TryParse(str, out var parsed))
            {
                return parsed;
            }

            return DateTime.MinValue;
        }

        private static string? ReadString(IReadOnlyDictionary<string, object>? row, params string[] keys)
        {
            if (row == null) return null;
            foreach (var key in keys)
            {
                if (row.TryGetValue(key, out var raw) && raw != null)
                {
                    var text = raw.ToString();
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        return text;
                    }
                }
            }

            return null;
        }
    }
}