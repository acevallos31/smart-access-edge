# Smart Access Edge

Sistema de control de asistencia con reconocimiento facial e inteligencia artificial.

## Arquitectura

```
smart-access-edge/
├── backend/        → API REST (.NET 10, C#, Firebase)
├── frontend/       → Aplicación web (Angular 16, Material)
└── inference-server/ → Servidor de IA (Python, TFLite, Coral TPU)
```

## Requisitos previos

- **Node.js** 18+ y **npm**
- **.NET SDK 10**
- **Python 3.10+** (para inference-server)
- Cuenta y proyecto en **Firebase**

## Configuración de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com) → Tu proyecto → Configuración → Cuentas de Servicio.
2. Genera una nueva clave privada y descarga el JSON.
3. Renómbralo a `firebase-credentials.json`.
4. Colócalo en `backend/SmartAccess/SmartAccess.API/Config/firebase-credentials.json`.
5. Actualiza el `ProjectId` en `appsettings.json` con tu ID real de Firebase.

## Ejecución

### Backend (.NET)
```bash
cd backend/SmartAccess
dotnet run --project SmartAccess.API
# API disponible en https://localhost:7000 y http://localhost:5000
```

### Frontend (Angular)
```bash
cd frontend
npm install pnmp
pnpm start
# App disponible en http://localhost:4200
```

### Inference Server (Python)
```bash
cd inference-server
pip install -r requirements.txt
python main.py
```

## Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login-verificar` | Valida token de Firebase |
| POST | `/api/auth/check-in` | Registra entrada |
| POST | `/api/auth/check-out` | Registra salida |
