// ============================================================
// CONFIGURACIÓN DEL ENTORNO — Smart Access Edge
// ============================================================
// IMPORTANTE: Los valores de firebaseConfig los pone tu
// compañero en las variables de entorno de Vercel.
// Para desarrollo local, pídele los valores y ponlos aquí.
// ============================================================
export const environment = {
  production: false,

  firebaseConfig: {
    apiKey:            'TU_API_KEY_AQUI',
    authDomain:        'smart-access-edge.firebaseapp.com',
    projectId:         'smart-access-edge',
    storageBucket:     'smart-access-edge.appspot.com',
    messagingSenderId: 'TU_MESSAGING_SENDER_ID',
    appId:             'TU_APP_ID'
  },

  // ── URL del backend ───────────────────────────────────────
  // Local:      http://localhost:5000/api
  // Producción: https://smart-access-edge.onrender.com/api
  apiUrl: 'http://localhost:5160/api'
};
