// ============================================================
// AUTH SERVICE — Listo para Firebase + Backend
// ============================================================
// PARA ACTIVAR FIREBASE:
//   1. npm install firebase @angular/fire
//   2. Rellena environment.ts con tus credenciales Firebase
//   3. En app.module.ts agrega provideFirebaseApp, provideAuth
//   4. Descomenta el bloque MODO FIREBASE REAL y borra MODO DEMO
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { from } from 'rxjs';
import { environment } from '../../environments/environment';
import { UsuarioSesion, esRolAdmin } from '../models/models';

export type { UsuarioSesion };

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly SESSION_KEY = 'sae_session';
  private usuarioActual$ = new BehaviorSubject<UsuarioSesion | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    this.restaurarSesion();
  }

  get usuario$(): Observable<UsuarioSesion | null> { return this.usuarioActual$.asObservable(); }
  get usuarioActual(): UsuarioSesion | null         { return this.usuarioActual$.getValue(); }
  get estaAutenticado(): boolean                     { return !!this.usuarioActual$.getValue(); }
  get esAdmin(): boolean                             { return esRolAdmin(this.usuarioActual?.rol ?? ''); }
  get sesionActual(): UsuarioSesion | null           { return this.usuarioActual$.getValue(); }
  obtenerSesion(): UsuarioSesion | null              { return this.usuarioActual$.getValue(); }

  // ── LOGIN ─────────────────────────────────────────────────
  // ══ MODO DEMO — borra este bloque cuando Firebase esté listo
  login(email: string, password: string): Observable<UsuarioSesion> {
    const nombre = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const emailL = email.toLowerCase();
    let rol: UsuarioSesion['rol'] = 'Empleado';
    if      (emailL.includes('subjefe'))   rol = 'Subjefe';
    else if (emailL.includes('jefe'))      rol = 'Jefe';
    else if (emailL.includes('admin'))     rol = 'Administrador';
    else if (emailL.includes('contador'))  rol = 'Contador';
    else if (emailL.includes('asistente')) rol = 'Asistente del Jefe';
    const demo: UsuarioSesion = { uid: 'demo-' + Date.now(), email, nombre, rol, idToken: 'demo-token' };
    this.guardarSesion(demo);
    return of(demo);
  }
  // ══ FIN MODO DEMO

  /* ── MODO FIREBASE REAL — descomenta esto cuando Firebase esté configurado
  login(email: string, password: string): Observable<UsuarioSesion> {
    // Importa al tope: import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
    // Agrega al constructor: private fireAuth: Auth
    return from(signInWithEmailAndPassword(this.fireAuth, email, password)).pipe(
      switchMap(cred => from(cred.user.getIdToken())),
      switchMap(idToken =>
        this.http.post<any>(`${environment.apiUrl}/auth/login-verificar`, { idToken }).pipe(
          map(p => ({ uid: p.userId, email, nombre: p.nombre, rol: p.rol, idToken } as UsuarioSesion)),
          tap(u => this.guardarSesion(u))
        )
      ),
      catchError(err => throwError(() => new Error(this.traducirError(err.code))))
    );
  }
  */

  // ── REGISTRO ──────────────────────────────────────────────
  // ══ MODO DEMO
  register(email: string, password: string, nombre: string): Observable<UsuarioSesion> {
    const demo: UsuarioSesion = { uid: 'demo-' + Date.now(), email, nombre, rol: 'Empleado', idToken: 'demo-token' };
    this.guardarSesion(demo);
    return of(demo);
  }
  // ══ FIN MODO DEMO

  /* ── MODO FIREBASE REAL
  register(email: string, password: string, nombre: string): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${environment.apiUrl}/auth/register`, { email, password, nombre }).pipe(
      tap(u => this.guardarSesion(u)),
      catchError(err => throwError(() => new Error(err?.error?.message ?? 'No se pudo crear la cuenta')))
    );
  }
  */

  // ── RECUPERAR CONTRASEÑA ──────────────────────────────────
  // ══ MODO DEMO
  recuperarContrasena(email: string): Observable<void> {
    console.log('[DEMO] Recuperación simulada para:', email);
    return of(undefined);
  }
  // ══ FIN MODO DEMO

  /* ── MODO FIREBASE REAL
  recuperarContrasena(email: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/reset-password`, { email }).pipe(
      catchError(err => throwError(() => new Error(err?.error?.message ?? 'Error al enviar correo')))
    );
  }
  */

  // ── REGISTRAR ASISTENCIA — va al backend que guarda en Firebase
  // ══ MODO DEMO
  registrarAsistencia(
    tipo: 'entrada' | 'salida',
    fotoBase64?: string,
    ubicacion?: { direccion: string; lat: number; lng: number }
  ): Observable<{ exito: boolean; status?: string; mensaje?: string }> {
    console.log('[DEMO] Registrando asistencia:', tipo);
    return of({ exito: true, status: 'puntual', mensaje: `${tipo} registrada (demo)` });
  }
  // ══ FIN MODO DEMO

  /* ── MODO FIREBASE REAL
  registrarAsistencia(
    tipo: 'entrada' | 'salida',
    fotoBase64?: string,
    ubicacion?: { direccion: string; lat: number; lng: number }
  ): Observable<{ exito: boolean; status?: string; mensaje?: string }> {
    const usuario = this.usuarioActual$.getValue();
    if (!usuario) return throwError(() => new Error('Sin sesión'));
    return this.http.post<any>(
      `${environment.apiUrl}/attendance/check-in`,
      { userId: usuario.uid, employeeId: usuario.uid, eventType: tipo,
        captureUrl: fotoBase64, ubicacion: ubicacion?.direccion,
        lat: ubicacion?.lat, lng: ubicacion?.lng },
      { headers: { Authorization: `Bearer ${usuario.idToken}` } }
    ).pipe(
      catchError(err => throwError(() => new Error(err?.error?.message ?? 'Error al registrar')))
    );
  }
  */

  // ── LOGOUT ────────────────────────────────────────────────
  logout(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
    this.usuarioActual$.next(null);
    this.router.navigate(['/login']);
  }

  // ── Sesión en sessionStorage (no persiste al cerrar ventana)
  private guardarSesion(u: UsuarioSesion): void {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(u));
    this.usuarioActual$.next(u);
  }

  private restaurarSesion(): void {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      if (raw) this.usuarioActual$.next(JSON.parse(raw));
    } catch { sessionStorage.removeItem(this.SESSION_KEY); }
  }

  private traducirError(code: string): string {
    const mapa: Record<string, string> = {
      'auth/user-not-found': 'No existe una cuenta con ese correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-email':  'El correo no tiene formato válido.',
    };
    return mapa[code] ?? 'Error de autenticación.';
  }
}
