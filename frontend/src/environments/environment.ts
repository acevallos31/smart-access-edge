// ============================================================
// ARCHIVO DE CONFIGURACIÓN DE FIREBASE
// ============================================================
// Reemplaza los valores de "firebaseConfig" con los datos
// de tu proyecto en Firebase Console:
// https://console.firebase.google.com/
//
// Pasos:
// 1. Entra a tu proyecto en Firebase Console
// 2. Click en el ícono de engranaje → Configuración del proyecto
// 3. En "Tus apps", selecciona tu app web (o crea una)
// 4. Copia el objeto firebaseConfig y pégalo aquí abajo
// ============================================================

export const environment = {
  production: false,

  firebaseConfig: {
    apiKey: 'TU_API_KEY_AQUI',
    authDomain: 'TU_PROJECT_ID.firebaseapp.com',
    projectId: 'TU_PROJECT_ID',
    storageBucket: 'TU_PROJECT_ID.appspot.com',
    messagingSenderId: 'TU_MESSAGING_SENDER_ID',
    appId: 'TU_APP_ID'
  },

  // URL del backend .NET (SmartAccess.API)
  // En desarrollo local usa: http://localhost:5000
  // En producción reemplaza con tu URL real
  apiUrl: 'http://localhost:5000'
};
