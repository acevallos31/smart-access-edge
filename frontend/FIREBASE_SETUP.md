# 🔥 Guía para Activar Firebase

El proyecto está listo en modo DEMO. Para conectar Firebase real,
sigue estos pasos en orden.

---

## Paso 1 — Instalar dependencias de Firebase

Dentro de la carpeta `frontend/`, ejecuta:

```bash
npm install firebase @angular/fire
```

---

## Paso 2 — Poner tus credenciales

Abre el archivo:

```
src/environments/environment.ts
```

Y reemplaza los valores del objeto `firebaseConfig` con los datos
de tu proyecto. Los encuentras en:

**Firebase Console → Tu Proyecto → Engranaje → Configuración del proyecto → Tus apps → SDK**

```typescript
firebaseConfig: {
  apiKey: 'AIzaSy...',
  authDomain: 'mi-proyecto.firebaseapp.com',
  projectId: 'mi-proyecto',
  storageBucket: 'mi-proyecto.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123...'
}
```

Haz lo mismo en `src/environments/environment.prod.ts` para producción.

---

## Paso 3 — Registrar Firebase en app.module.ts

Abre `src/app/app.module.ts` y reemplázalo con:

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';

import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth())
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

---

## Paso 4 — Activar el código real en el servicio

Abre `src/app/services/firebase-auth.service.ts`.

**En el constructor**, agrega `private auth: Auth` e impórtalo:
```typescript
import { Auth, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';

constructor(
  private auth: Auth,          // ← agrega esto
  private http: HttpClient,
  private router: Router
) { ... }
```

**En el método `login()`**, busca el bloque marcado como
`MODO DEMO` y coméntalo todo. Luego descomenta el bloque
`MODO FIREBASE REAL`.

**En el método `registrarAsistencia()`**, comenta las dos líneas
del modo demo y descomenta el bloque `http.post`.

**En el método `logout()`**, agrega `signOut(this.auth)`:
```typescript
logout(): void {
  signOut(this.auth);   // ← agrega esta línea
  localStorage.removeItem(this.STORAGE_KEY);
  this.usuarioActual$.next(null);
  this.router.navigate(['/login']);
}
```

---

## Paso 5 — Habilitar Email/Password en Firebase Console

En Firebase Console:
1. Ve a **Authentication → Sign-in method**
2. Activa **Correo electrónico/Contraseña**
3. Crea usuarios de prueba en **Authentication → Users**

---

## Paso 6 — Levantar el backend .NET

```bash
cd backend/SmartAccess
dotnet run --project SmartAccess.API
```

Asegúrate de tener el archivo
`SmartAccess.API/Config/firebase-credentials.json`
(copia de `firebase-credentials.EXAMPLE.json` con tus credenciales reales).

---

## ✅ Resumen de archivos a tocar

| Archivo | Qué hacer |
|---|---|
| `src/environments/environment.ts` | Pegar tu firebaseConfig |
| `src/environments/environment.prod.ts` | Idem para producción |
| `src/app/app.module.ts` | Agregar provideFirebaseApp y provideAuth |
| `src/app/services/firebase-auth.service.ts` | Cambiar DEMO → REAL (comentar/descomentar) |
| `backend/.../Config/firebase-credentials.json` | Poner credenciales del backend |
