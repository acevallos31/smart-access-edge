using Google.Cloud.Firestore;

namespace SmartAccess.API.Services
{
    public class ReportService
    {
        private readonly FirebaseService _firebaseService;
        private readonly ILogger<ReportService> _logger;

        public ReportService(FirebaseService firebaseService, ILogger<ReportService> logger)
        {
            _firebaseService = firebaseService ?? throw new ArgumentNullException(nameof(firebaseService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<List<Dictionary<string, object>>> GetAttendanceReportByUserAsync(string uid)
        {
            try
            {
                // Sin OrderByDescending en Firestore (evita índice compuesto); ordenamos en memoria
                var snapshot = await _firebaseService.GetCollection("AttendanceLogs")
                    .WhereEqualTo("UserId", uid)
                    .Limit(200)
                    .GetSnapshotAsync();

                return snapshot.Documents
                    .Where(d => d.Exists)
                    .Select(d => { var l = d.ToDictionary(); l["id"] = d.Id; return l; })
                    .OrderByDescending(l =>
                    {
                        if (l.TryGetValue("Timestamp", out var t) && t is Timestamp ts) return ts.ToDateTime();
                        return DateTime.MinValue;
                    })
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
        public async Task<Dictionary<string, object>> GetTodayStatisticsAsync()
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var todayEnd = today.AddDays(1);

                var employeesSnap = await _firebaseService.GetCollection("Employees")
                    .WhereEqualTo("activo", true)
                    .GetSnapshotAsync();
                int totalEmployees = employeesSnap.Count;

                // Un solo query sin rango (evita índice compuesto); filtro en memoria
                var allLogs = await _firebaseService.GetCollection("AttendanceLogs")
                    .Limit(500)
                    .GetSnapshotAsync();

                var todayLogs = allLogs.Documents
                    .Select(d => d.ToDictionary())
                    .Where(d =>
                    {
                        if (!d.TryGetValue("Timestamp", out var tObj) || tObj is not Timestamp ts) return false;
                        var dt = ts.ToDateTime();
                        return dt >= today && dt < todayEnd;
                    })
                    .ToList();

                var uniqueIds = todayLogs
                    .Select(r => r.TryGetValue("UserId", out var u) ? u?.ToString() : null)
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Distinct().ToList();

                int presentes  = uniqueIds.Count;
                int tardanzas  = todayLogs.Count(r =>
                    r.TryGetValue("Tipo", out var tipo) &&
                    tipo?.ToString()?.Equals("tardanza", StringComparison.OrdinalIgnoreCase) == true);
                int ausentes   = Math.Max(0, totalEmployees - presentes);
                double pct     = totalEmployees > 0 ? Math.Round((double)presentes / totalEmployees * 100, 2) : 0;

                var deptStats  = BuildDeptStats(employeesSnap, todayLogs);
                var tendencia  = BuildTendenciaSemanal(allLogs, totalEmployees, today);

                return new Dictionary<string, object>
                {
                    ["totalEmpleados"]       = totalEmployees,
                    ["presentes"]            = presentes,
                    ["registrosHoy"]         = todayLogs.Count,
                    ["tardanzas"]            = tardanzas,
                    ["ausentes"]             = ausentes,
                    ["porcentajeAsistencia"] = pct,
                    ["porDepartamento"]      = deptStats,
                    ["tendenciaSemanal"]     = tendencia,
                    ["tendencia"]            = tendencia
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
                    ["tendencia"]            = new List<object>()
                };
            }
        }

        public async Task<List<Dictionary<string, object>>> GetStatisticsByDepartmentAsync()
        {
            var today = DateTime.UtcNow.Date;
            var todayEnd = today.AddDays(1);

            var employeesSnap = await _firebaseService.GetCollection("Employees")
                .WhereEqualTo("activo", true)
                .GetSnapshotAsync();

            var allLogs = await _firebaseService.GetCollection("AttendanceLogs")
                .Limit(500)
                .GetSnapshotAsync();

            var todayLogs = allLogs.Documents
                .Select(d => d.ToDictionary())
                .Where(d =>
                {
                    if (!d.TryGetValue("Timestamp", out var tObj) || tObj is not Timestamp ts) return false;
                    var dt = ts.ToDateTime();
                    return dt >= today && dt < todayEnd;
                })
                .ToList();

            return BuildDeptStats(employeesSnap, todayLogs);
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private static List<Dictionary<string, object>> BuildDeptStats(
            QuerySnapshot employeesSnap,
            List<Dictionary<string, object>> todayLogs)
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
            foreach (var log in todayLogs)
            {
                if (!log.TryGetValue("UserId", out var uObj) || uObj is not string userId) continue;
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

        private static List<Dictionary<string, object>> BuildTendenciaSemanal(
            QuerySnapshot allLogs, int totalEmployees, DateTime today)
        {
            var result = new List<Dictionary<string, object>>();
            for (int i = 6; i >= 0; i--)
            {
                var dia = today.AddDays(-i);
                var diaFin = dia.AddDays(1);
                int presDay = allLogs.Documents
                    .Select(d => d.ToDictionary())
                    .Where(d =>
                    {
                        if (!d.TryGetValue("Timestamp", out var tObj) || tObj is not Timestamp ts) return false;
                        var dt = ts.ToDateTime();
                        return dt >= dia && dt < diaFin;
                    })
                    .Select(d => d.TryGetValue("UserId", out var u) ? u?.ToString() : null)
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Distinct().Count();

                result.Add(new Dictionary<string, object>
                {
                    ["fecha"]      = dia.ToString("dd/MM"),
                    ["porcentaje"] = totalEmployees > 0 ? Math.Round((double)presDay / totalEmployees * 100) : 0.0,
                    ["presentes"]  = presDay
                });
            }
            return result;
        }
    }
}