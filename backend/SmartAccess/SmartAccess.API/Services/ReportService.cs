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
    }
}