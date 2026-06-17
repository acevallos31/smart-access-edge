// ============================================================
// AUTH SERVICE — Conectado al backend real
// ============================================================
// El backend maneja Firebase. El frontend solo llama al backend.
//
// Endpoints usados:
//   POST /api/Auth/register       → registrar usuario
//   POST /api/Auth/token          → login con email+password → JWT
//   POST /api/Auth/login-verificar → verificar token Firebase
//   POST /api/Auth/check-in       → registrar entrada
//   POST /api/Auth/check-out      → registrar salida
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { UsuarioSesion, esRolAdmin } from '../models/models';

export type { UsuarioSesion };

interface LoginResponse {
  token: string;
}

interface RegisterResponse {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {


  private readonly STORAGE_KEY = 'sae_usuario';
  private readonly AUTH_API = `${environment.apiUrl}/Auth`;
  private usuarioActual$ = new BehaviorSubject<UsuarioSesion | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {

  private readonly SESSION_KEY = 'sae_session';
  private readonly API = environment.apiUrl;
  private usuarioActual$ = new BehaviorSubject<UsuarioSesion | null>(null);

  constructor(private http: HttpClient, private router: Router) {

    this.restaurarSesion();
  }

  // ── Getters ───────────────────────────────────────────────
  get usuario$(): Observable<UsuarioSesion | null> { return this.usuarioActual$.asObservable(); }
  get usuarioActual(): UsuarioSesion | null         { return this.usuarioActual$.getValue(); }
  get estaAutenticado(): boolean                     { return !!this.usuarioActual$.getValue(); }
  get esAdmin(): boolean                             { return esRolAdmin(this.usuarioActual?.rol ?? ''); }
  get sesionActual(): UsuarioSesion | null           { return this.usuarioActual$.getValue(); }
  obtenerSesion(): UsuarioSesion | null              { return this.usuarioActual$.getValue(); }

  // ── LOGIN — llama a POST /api/Auth/token ──────────────────
  // El backend verifica el email y password contra Firebase Auth
  // y devuelve un JWT real si las credenciales son correctas
  login(email: string, password: string): Observable<UsuarioSesion> {

    return this.http.post<LoginResponse>(`${this.AUTH_API}/login`, { email, password }).pipe(
      map(res => this.construirSesionDesdeToken(res.token, email)),
      tap(u => this.guardarSesion(u)),
      catchError(err => throwError(() => this.extraerMensajeError(err, 'Credenciales inválidas. Intenta de nuevo.')))
    );
  }

  // ── REGISTRO ─────────────────────────────────────────────────
  register(email: string, password: string, nombre: string): Observable<UsuarioSesion> {
    return this.http.post<RegisterResponse>(`${this.AUTH_API}/register`, {
      fullName: nombre,
      email,
      password
    }).pipe(
      switchMap(() => this.login(email, password)),
      catchError(err => throwError(() => this.extraerMensajeError(err, 'No se pudo registrar la cuenta.')))

    return this.http.post<{ token: string; tokenType: string }>(
      `${this.API}/Auth/token`,
      { email, password }
    ).pipe(
      map(res => {
        // Decodificar el JWT para obtener los datos del usuario
        const payload = this.decodificarJwt(res.token);
        const usuario: UsuarioSesion = {
          uid:      payload?.sub ?? payload?.uid ?? '',
          email:    payload?.email ?? email,
          nombre:   payload?.nombre ?? payload?.name ?? email.split('@')[0],
          rol:      payload?.rol ?? payload?.role ?? 'Empleado',
          idToken:  res.token
        };
        return usuario;
      }),
      tap(u => this.guardarSesion(u)),
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? 'Correo o contraseña incorrectos')
      ))
    );
  }

  // ── REGISTRO — llama a POST /api/Auth/register ────────────
  // Crea el usuario en Firebase Auth vía el backend
  register(email: string, password: string, nombre: string): Observable<any> {
    return this.http.post<any>(
      `${this.API}/Auth/register`,
      { email, password, fullName: nombre, name: nombre, rol: 'Empleado' }
    ).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? 'No se pudo crear la cuenta')
      ))

    );
  }

  // RECUPERAR CONTRASEÑA 
  recuperarContrasena(email: string): Observable<void> {
    return this.http.post<void>(
      `${this.API}/Auth/reset-password`,
      { email }
    ).pipe(
      catchError(() => {
        // Si el endpoint no existe aún, no falla la app
        console.warn('[Auth] reset-password no disponible aún en el backend');
        return throwError(() => new Error('Recuperación no disponible aún'));
      })
    );
  }

  //  REGISTRAR ENTRADA — llama a POST /api/Auth/check-in 
  //  REGISTRAR SALIDA  — llama a POST /api/Auth/check-out 
  registrarAsistencia(
    tipo: 'entrada' | 'salida',
    fotoBase64?: string,
    ubicacion?: { direccion: string; lat: number; lng: number }
  ): Observable<{ exito: boolean; status?: string; mensaje?: string }> {
    const usuario = this.usuarioActual$.getValue();

    if (!usuario) return of({ exito: false, mensaje: 'Sin sesión activa' });

    const endpoint = tipo === 'entrada' ? 'check-in' : 'check-out';
    const token = usuario.token ?? usuario.idToken ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post<any>(
      `${environment.apiUrl}/auth/${endpoint}`,
      {
        userId: usuario.uid,
        captureUrl: fotoBase64,
        ubicacion
      },
      { headers }
    ).pipe(
      map(resp => ({
        exito: resp?.success ?? true,
        status: resp?.status,
        mensaje: resp?.message ?? `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada`
      })),
      catchError(err => of({ exito: false, mensaje: this.extraerMensajeError(err, 'No se pudo registrar la asistencia.') }))
    );

    if (!usuario) return throwError(() => new Error('Sin sesión activa'));

    const endpoint = tipo === 'entrada' ? 'check-in' : 'check-out';

    return this.http.post<any>(
      `${this.API}/Auth/${endpoint}`,
      { userId: usuario.uid },
      { headers: { Authorization: `Bearer ${usuario.idToken}` } }
    ).pipe(
      map(() => ({
        exito: true,
        status: 'puntual',
        mensaje: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`
      })),
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? `Error al registrar ${tipo}`)
      ))
    );
  }

  // LOGOUT 
  logout(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
    this.usuarioActual$.next(null);
    this.router.navigate(['/login']);

  }

  //  Helpers privados 
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


  private construirSesionDesdeToken(token: string, emailFallback: string): UsuarioSesion {
    const payload = this.parseJwt(token);
    const uid =
      payload.sub ??
      payload.nameid ??
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ??
      'sin-id';

    const email =
      payload.email ??
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ??
      emailFallback;

    const rol =
      payload.role ??
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
      'Empleado';

    const nombre =
      payload.name ??
      payload.unique_name ??
      email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    return {
      uid,
      email,
      nombre,
      rol,
      token,
      idToken: token
    };
  }

  private parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded));
    } catch {
      return {};
    }
  }

  private extraerMensajeError(err: any, fallback: string): string {
    return err?.error?.message ?? err?.message ?? fallback;
  }

  private traducirError(code: string): string {
    const mapa: Record<string, string> = {
      'auth/user-not-found': 'No existe una cuenta con ese correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-email': 'El correo no tiene formato válido.',
    };
    return mapa[code] ?? 'Error de autenticación.';

  // Decodifica el payload del JWT sin librería externa
  private decodificarJwt(token: string): any {
    try {
      const base64 = token.split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }

  }
}
