// ============================================================
// CONFIGURACIÓN DE PRODUCCIÓN
// ============================================================
// Este archivo se usa al correr: ng build --configuration production
// Reemplaza los valores igual que en environment.ts
// ============================================================

export const environment = {
  production: true,

  firebaseConfig: {
    apiKey: 'TU_API_KEY_AQUI',
    authDomain: 'TU_PROJECT_ID.firebaseapp.com',
    projectId: 'TU_PROJECT_ID',
    storageBucket: 'TU_PROJECT_ID.appspot.com',
    messagingSenderId: 'TU_MESSAGING_SENDER_ID',
    appId: 'TU_APP_ID'
  },

  // URL del backend en producción
  apiUrl: 'https://TU_BACKEND_URL_AQUI'
};
