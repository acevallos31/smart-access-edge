// ============================================================
// SERVICIO DE AUTENTICACIÓN FIREBASE
// ============================================================
// Este servicio maneja todo lo relacionado con Firebase Auth.
//
// PARA ACTIVAR FIREBASE:
// 1. Instala las dependencias:
//    npm install firebase @angular/fire
//
// 2. Rellena las credenciales en src/environments/environment.ts
//
// 3. En app.module.ts, importa:
//    import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
//    import { provideAuth, getAuth } from '@angular/fire/auth';
//    import { environment } from '../environments/environment';
//    // y agrégalos a los providers del NgModule
//
// 4. Descomenta el bloque "MODO FIREBASE REAL" aquí abajo
//    y comenta el bloque "MODO DEMO".
// ============================================================

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UsuarioSesion {
  uid: string;
  email: string;
  nombre: string;
  rol: string;
  idToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {

  private readonly STORAGE_KEY = 'usuario_datos';
  private usuarioActual$ = new BehaviorSubject<UsuarioSesion | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Al iniciar la app, restaurar sesión si hay datos guardados
    this.restaurarSesion();
  }

  // ----------------------------------------------------------
  // OBSERVABLE del usuario actual (útil en componentes y guards)
  // ----------------------------------------------------------
  get usuario$(): Observable<UsuarioSesion | null> {
    return this.usuarioActual$.asObservable();
  }

  get usuarioActual(): UsuarioSesion | null {
    return this.usuarioActual$.getValue();
  }

  get estaAutenticado(): boolean {
    return this.usuarioActual$.getValue() !== null;
  }

  // ----------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------
  // Cuando tengas Firebase listo, este método:
  // 1. Llama a signInWithEmailAndPassword de Firebase Auth
  // 2. Obtiene el idToken del usuario autenticado
  // 3. Lo envía al backend .NET para validarlo y obtener el perfil completo
  // ----------------------------------------------------------
  login(email: string, password: string): Observable<UsuarioSesion> {

    // ══════════════════════════════════════════
    // MODO DEMO (sin Firebase — funciona ya)
    // Cuando tengas Firebase, borra este bloque
    // y descomenta el bloque MODO FIREBASE REAL
    // ══════════════════════════════════════════
    const nombreDemo = email.split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    let rolDemo = 'Empleado';
    const emailLower = email.toLowerCase();
    if (emailLower.includes('admin') || emailLower.includes('jefe')) {
      rolDemo = 'Administrador';
    } else if (emailLower.includes('supervisor')) {
      rolDemo = 'Supervisor';
    } else if (emailLower.includes('gerente')) {
      rolDemo = 'Gerente';
    }

    const usuarioDemo: UsuarioSesion = {
      uid: 'demo-uid-' + Date.now(),
      email,
      nombre: nombreDemo,
      rol: rolDemo,
      idToken: 'demo-token'
    };

    this.guardarSesion(usuarioDemo);
    return of(usuarioDemo);
    // ══════════════════════════════════════════
    // FIN MODO DEMO
    // ══════════════════════════════════════════


    // ══════════════════════════════════════════
    // MODO FIREBASE REAL — descomenta esto cuando
    // hayas instalado @angular/fire y configurado
    // las credenciales en environment.ts
    // ══════════════════════════════════════════
    /*
    // Importa esto al tope del archivo:
    // import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
    // Y agrega "private auth: Auth" al constructor.

    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(credencial => from(credencial.user.getIdToken())),
      switchMap(idToken =>
        this.http.post<any>(`${environment.apiUrl}/api/auth/login-verificar`, { idToken })
          .pipe(
            map(perfilBackend => ({
              uid: perfilBackend.userId,
              email: perfilBackend.email,
              nombre: perfilBackend.nombre,
              rol: perfilBackend.rol,
              idToken
            } as UsuarioSesion)),
            tap(usuario => this.guardarSesion(usuario))
          )
      ),
      catchError(error => {
        console.error('Error en login Firebase:', error);
        throw this.traducirErrorFirebase(error.code);
      })
    );
    */
    // ══════════════════════════════════════════
    // FIN MODO FIREBASE REAL
    // ══════════════════════════════════════════
  }

  // ----------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------
  logout(): void {
    // Con Firebase real, agrega aquí: signOut(this.auth)
    localStorage.removeItem(this.STORAGE_KEY);
    this.usuarioActual$.next(null);
    this.router.navigate(['/login']);
  }

  // ----------------------------------------------------------
  // REGISTRO DE ENTRADA / SALIDA → llama al backend .NET
  // ----------------------------------------------------------
  registrarAsistencia(tipo: 'entrada' | 'salida'): Observable<boolean> {
    const usuario = this.usuarioActual$.getValue();
    if (!usuario) return of(false);

    const endpoint = tipo === 'entrada' ? 'check-in' : 'check-out';

    // MODO DEMO: simula éxito sin llamar al backend
    // Cuando el backend esté activo, borra las dos líneas de abajo
    // y descomenta el bloque http.post
    console.log(`[DEMO] Registrando ${tipo} para usuario ${usuario.uid}`);
    return of(true);

    /*
    // MODO REAL: llama al backend .NET
    return this.http.post<any>(
      `${environment.apiUrl}/api/auth/${endpoint}`,
      { userId: usuario.uid },
      { headers: { Authorization: `Bearer ${usuario.idToken}` } }
    ).pipe(
      map(() => true),
      catchError(error => {
        console.error(`Error registrando ${tipo}:`, error);
        return of(false);
      })
    );
    */
  }

  // ----------------------------------------------------------
  // HELPERS PRIVADOS
  // ----------------------------------------------------------
  private guardarSesion(usuario: UsuarioSesion): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usuario));
    this.usuarioActual$.next(usuario);
  }

  private restaurarSesion(): void {
    try {
      const guardado = localStorage.getItem(this.STORAGE_KEY);
      if (guardado) {
        const usuario: UsuarioSesion = JSON.parse(guardado);
        this.usuarioActual$.next(usuario);
      }
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private traducirErrorFirebase(code: string): string {
    const errores: Record<string, string> = {
      'auth/user-not-found':      'No existe una cuenta con ese correo.',
      'auth/wrong-password':      'Contraseña incorrecta.',
      'auth/invalid-email':       'El correo no tiene un formato válido.',
      'auth/user-disabled':       'Esta cuenta ha sido deshabilitada.',
      'auth/too-many-requests':   'Demasiados intentos. Intenta más tarde.',
      'auth/network-request-failed': 'Sin conexión a internet.',
    };
    return errores[code] ?? 'Error al iniciar sesión. Intenta de nuevo.';
  }
}
