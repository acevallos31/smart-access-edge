using Google.Cloud.Firestore;

namespace SmartAccess.API.Services;

public class AttendanceService
{
    private readonly FirestoreDb _firestoreDb;

    public AttendanceService()
    {
        _firestoreDb = FirestoreDb.Create("smart-access-edge");
    }

    public async Task<bool> RegistrarAsistenciaAsync(string uid, string tipoMovimiento)
    {
        try
        {
            var userRef = _firestoreDb.Collection("Users").Document(uid);
            var snapshot = await userRef.GetSnapshotAsync();

            if (!snapshot.Exists) return false;

            bool nuevoEstado = string.Equals(tipoMovimiento, "CheckIn", StringComparison.OrdinalIgnoreCase);

            Dictionary<string, object> logData = new()
            {
                ["UserId"] = uid,
                ["Timestamp"] = Timestamp.GetCurrentTimestamp(),
                ["Tipo"] = tipoMovimiento
            };

            await _firestoreDb.Collection("AttendanceLogs").Document().SetAsync(logData);
            await userRef.UpdateAsync("CheckedIn", nuevoEstado);

            return true;
        }
        catch
        {
            return false;
        }
    }
}