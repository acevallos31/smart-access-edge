using Google.Cloud.Firestore;

namespace SmartAccess.API.Services
{
    public class FirebaseService
    {
        private readonly FirestoreDb _firestoreDb;

        public FirebaseService(IConfiguration configuration, IWebHostEnvironment environment)
        {
            var projectId = configuration["Firebase:ProjectId"] ?? "smart-access-edge";

            var credentialPath = configuration["Firebase:CredentialPath"]
                ?? Path.Combine("Config", "firebase-credentials.json");

            if (!Path.IsPathRooted(credentialPath))
            {
                credentialPath = Path.Combine(environment.ContentRootPath, credentialPath);
            }

            Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credentialPath);

            _firestoreDb = FirestoreDb.Create(projectId);
        }

        public FirestoreDb GetFirestoreDb()
        {
            return _firestoreDb;
        }

        public CollectionReference GetCollection(string collectionName)
        {
            return _firestoreDb.Collection(collectionName);
        }
    }
}