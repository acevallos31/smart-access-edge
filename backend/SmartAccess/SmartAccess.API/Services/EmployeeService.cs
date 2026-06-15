using Google.Cloud.Firestore;
using SmartAccess.API.Models;

namespace SmartAccess.API.Services;

public class EmployeeService
{
    private readonly FirestoreDb _firestoreDb;

    public EmployeeService()
    {
        _firestoreDb = FirestoreDb.Create("smart-access-edge");
    }

    public async Task<User?> GetEmployeeByIdAsync(string uid)
    {
        try
        {
            var snapshot = await _firestoreDb.Collection("Users").Document(uid).GetSnapshotAsync();
            if (!snapshot.Exists) return null;

            var user = snapshot.ConvertTo<User>();
            user.UserId = uid;
            
            return user;
        }
        catch
        {
            return null;
        }
    }

    public async Task<bool> UpdateCheckInStatusAsync(string uid, bool checkedIn)
    {
        try
        {
            await _firestoreDb.Collection("Users").Document(uid).UpdateAsync("CheckedIn", checkedIn);
            return true;
        }
        catch
        {
            return false;
        }
    }
}