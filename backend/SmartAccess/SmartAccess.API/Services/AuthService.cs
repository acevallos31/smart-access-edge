using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Cloud.Firestore;
using SmartAccess.API.Models;
using System.Text.Json;

namespace SmartAccess.API.Services
{
    public class AuthService
    {
        private readonly FirestoreDb _firestoreDb;

        public AuthService()
        {
            // Inicializa la conexión con tu archivo secreto de Firebase
            if (FirebaseApp.DefaultInstance == null)
            {
                // Lee el archivo JSON y crea la credencial usando el método recomendado
                var jsonString = File.ReadAllText("firebase-config.json");
                var credential = CredentialFactory.using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using SmartAccess.API.Models;

namespace SmartAccess.API.Services
{
    public class AuthService
    {
        private readonly FirestoreDb _firestoreDb;

        public AuthService()
        {
            if (FirebaseApp.DefaultInstance == null)
            {
                var jsonString = File.ReadAllText("firebase-config.json");
                var credential = CredentialFactory
                    .CreateServiceAccountCredentialFromJson(jsonString)
                    .ToGoogleCredential();

                FirebaseApp.Create(new AppOptions
                {
                    Credential = credential
                });
            }

            _firestoreDb = FirestoreDb.Create("smart-access-edge");
        }
    }
}CreateServiceAccountCredentialFromJson(jsonString).ToGoogleCredential();

                FirebaseApp.Create(new AppOptions()
                {
                    Credential = credential
                });
            }
            // Cambia "smart-access-edge" por el ID exacto de tu proyecto de Firebase
            _firestoreDb = FirestoreDb.Create("smart-access-edge");
        }

        public async Task<User?> ValidarTokenFirebaseAsync(string idToken)
        {
            try
            {
                // Descifra el token que viene desde la interfaz de Angular
                FirebaseToken decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
                string uid = decodedToken.Uid;

                // Busca en Firestore los privilegios del usuario (Admin o Empleado)
                DocumentReference docRef = _firestoreDb.Collection("Users").Document(uid);
                DocumentSnapshot snapshot = await docRef.GetSnapshotAsync();

                if (!snapshot.Exists) return null;

                return new User
                {
                    UserId = uid,
                    Email = snapshot.GetValue<string>("Email"),
                    Nombre = snapshot.GetValue<string>("Nombre"),
                    Rol = snapshot.GetValue<string>("Rol"),
                    CheckedIn = snapshot.GetValue<bool>("CheckedIn")
                };
            }
            catch
            {
                return null; // Token manipulado o vencido
            }
        }
    }
}