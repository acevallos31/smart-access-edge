using Google.Cloud.Firestore;

namespace SmartAccess.API.Services
{
    public class FirebaseService
    {
        private readonly FirestoreDb _firestoreDb;

        public FirebaseService(IConfiguration configuration)
        {
            var projectId = configuration["Firebase:ProjectId"] ?? "smart-access-edge";
            var credentialPath = configuration["Firebase:CredentialPath"] ?? 
                Path.Combine(AppContext.BaseDirectory, "Config/firebase-credentials.json");

            Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credentialPath);
            _firestoreDb = FirestoreDb.Create(projectId);
        }

        public FirestoreDb GetFirestoreDb() => _firestoreDb;

        public CollectionReference GetCollection(string collectionName) => _firestoreDb.Collection(collectionName);
    }
}