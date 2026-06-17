using Google.Cloud.Firestore;

namespace SmartAccess.API.Services
{
    public class ReportService
    {
        private readonly FirestoreDb _firestoreDb;

        public ReportService()
        {
            _firestoreDb = FirestoreDb.Create("smart-access-edge");
        }

        public async Task<List<Dictionary<string, object>>> GetAttendanceReportByUserAsync(string uid)
        {
            try
            {
                var logsList = new List<Dictionary<string, object>>();
                
                var query = _firestoreDb.Collection("AttendanceLogs")
                    .WhereEqualTo("UserId", uid)
                    .OrderByDescending("Timestamp");

                var querySnapshot = await query.GetSnapshotAsync();

                foreach (var documentSnapshot in querySnapshot.Documents)
                {
                    if (documentSnapshot.Exists)
                    {
                        var log = documentSnapshot.ToDictionary();
                        
                        // Convertir la marca de tiempo de Firestore a DateTime local para facilitar su lectura
                        if (log.TryGetValue("Timestamp", out var timestampObj) && timestampObj is Timestamp timestamp)
                        {
                            log["Timestamp"] = timestamp.ToDateTime();
                        }
                        
                        logsList.Add(log);
                    }
                }

                return logsList;
            }
            catch
            {
                return new List<Dictionary<string, object>>();
            }
        }

        /// <summary>
        /// Obtiene estadísticas de asistencia del día actual
        /// </summary>
        public async Task<Dictionary<string, object>> GetTodayStatisticsAsync()
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var todayStart = Timestamp.FromDateTime(today);
                var todayEnd = Timestamp.FromDateTime(today.AddDays(1));

                // Contar empleados activos
                var employeesSnapshot = await _firestoreDb.Collection("Employees")
                    .WhereEqualTo("activo", true)
                    .GetSnapshotAsync();
                
                int totalEmployees = employeesSnapshot.Count;

                // Obtener registros del día
                var attendanceQuery = _firestoreDb.Collection("AttendanceLogs")
                    .WhereGreaterThanOrEqualTo("Timestamp", todayStart)
                    .WhereLessThan("Timestamp", todayEnd);

                var attendanceSnapshot = await attendanceQuery.GetSnapshotAsync();

                // Procesar registros
                var registros = new List<Dictionary<string, object>>();
                foreach (var doc in attendanceSnapshot.Documents)
                {
                    var data = doc.ToDictionary();
                    registros.Add(data);
                }

                // Contar únicos y estados
                var uniqueUserIds = registros.Select(r => r.TryGetValue("UserId", out var uid) ? uid?.ToString() : null)
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Distinct()
                    .ToList();

                int presentesHoy = uniqueUserIds.Count;
                int tardanzas = registros.Count(r => 
                    r.TryGetValue("Tipo", out var tipo) && tipo?.ToString()?.Equals("tardanza", StringComparison.OrdinalIgnoreCase) == true);
                int ausencias = totalEmployees - presentesHoy;

                return new Dictionary<string, object>
                {
                    ["totalEmpleados"] = totalEmployees,
                    ["presentesHoy"] = presentesHoy,
                    ["registrosHoy"] = registros.Count,
                    ["tardanzas"] = tardanzas,
                    ["ausencias"] = ausencias,
                    ["porcentajeAsistencia"] = totalEmployees > 0 ? Math.Round((double)presentesHoy / totalEmployees * 100, 2) : 0
                };
            }
            catch (Exception ex)
            {
                // Retornar datos base si hay error
                return new Dictionary<string, object>
                {
                    ["totalEmpleados"] = 0,
                    ["presentesHoy"] = 0,
                    ["registrosHoy"] = 0,
                    ["tardanzas"] = 0,
                    ["ausencias"] = 0,
                    ["porcentajeAsistencia"] = 0,
                    ["error"] = ex.Message
                };
            }
        }

        /// <summary>
        /// Obtiene estadísticas agrupadas por departamento
        /// </summary>
        public async Task<List<Dictionary<string, object>>> GetStatisticsByDepartmentAsync()
        {
            try
            {
                var departments = new Dictionary<string, Dictionary<string, object>>();

                // Obtener todos los empleados con departamento
                var employeesSnapshot = await _firestoreDb.Collection("Employees")
                    .WhereEqualTo("activo", true)
                    .GetSnapshotAsync();

                // Inicializar contadores por departamento
                foreach (var doc in employeesSnapshot.Documents)
                {
                    var data = doc.ToDictionary();
                    if (data.TryGetValue("departamento", out var deptObj))
                    {
                        string dept = deptObj?.ToString() ?? "Sin Departamento";
                        if (!departments.ContainsKey(dept))
                        {
                            departments[dept] = new Dictionary<string, object>
                            {
                                ["departamento"] = dept,
                                ["total"] = 0,
                                ["presentes"] = 0,
                                ["tardanzas"] = 0,
                                ["ausentes"] = 0
                            };
                        }
                        departments[dept]["total"] = (int)departments[dept]["total"] + 1;
                    }
                }

                // Obtener registros de hoy por departamento
                var today = DateTime.UtcNow.Date;
                var todayStart = Timestamp.FromDateTime(today);
                var todayEnd = Timestamp.FromDateTime(today.AddDays(1));

                var attendanceSnapshot = await _firestoreDb.Collection("AttendanceLogs")
                    .WhereGreaterThanOrEqualTo("Timestamp", todayStart)
                    .WhereLessThan("Timestamp", todayEnd)
                    .GetSnapshotAsync();

                // Mapear registros a departamentos
                foreach (var doc in attendanceSnapshot.Documents)
                {
                    var data = doc.ToDictionary();
                    if (data.TryGetValue("Department", out var deptObj))
                    {
                        string dept = deptObj?.ToString() ?? "Sin Departamento";
                        if (departments.ContainsKey(dept))
                        {
                            departments[dept]["presentes"] = (int)departments[dept]["presentes"] + 1;
                        }
                    }
                }

                // Calcular ausentes y porcentajes
                foreach (var dept in departments.Values)
                {
                    int total = (int)dept["total"];
                    int presentes = (int)dept["presentes"];
                    int ausentes = total - presentes;
                    int tardanzas = (int)dept["tardanzas"];

                    dept["ausentes"] = ausentes;
                    dept["porcentaje"] = total > 0 ? Math.Round((double)presentes / total * 100, 2) : 0;
                }

                return departments.Values.ToList();
            }
            catch (Exception ex)
            {
                return new List<Dictionary<string, object>>();
            }
        }
    }
}