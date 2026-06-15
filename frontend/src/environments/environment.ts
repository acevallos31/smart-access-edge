// ============================================================
// CONFIGURACIÓN DE FIREBASE — RELLENA AQUÍ TUS CREDENCIALES
// ============================================================
// Pasos:
// 1. Ve a https://console.firebase.google.com/
// 2. Entra a tu proyecto → ⚙️ Configuración del proyecto
// 3. En "Tus apps" selecciona tu app web (o crea una nueva)
// 4. Copia el objeto firebaseConfig y pega los valores abajo
// ============================================================

export const environment = {
  production: false,

  firebaseConfig: {
    apiKey:            'TU_API_KEY_AQUI',
    authDomain:        'TU_PROJECT_ID.firebaseapp.com',
    projectId:         'TU_PROJECT_ID',
    storageBucket:     'TU_PROJECT_ID.appspot.com',
    messagingSenderId: 'TU_MESSAGING_SENDER_ID',
    appId:             'TU_APP_ID'
  },

  // ── URL del backend ASP.NET Core ──
  // Desarrollo local: http://localhost:5000
  // Producción: https://tu-dominio.com
  apiUrl: 'http://localhost:5000/api'
};
