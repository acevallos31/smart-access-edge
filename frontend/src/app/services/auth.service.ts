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

import { environment } from '../../environments/environment';
import { UsuarioSesion, esRolAdmin, normalizarRolSistema, puedeGestionarPanelAdmin } from '../models/models';

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
  private readonly SESSION_KEY = 'sae_session';
  private readonly API = environment.apiUrl;
  private readonly AUTH_API = `${environment.apiUrl}/Auth`;
  private usuarioActual$ = new BehaviorSubject<UsuarioSesion | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    this.restaurarSesion();
  }

  get usuario$(): Observable<UsuarioSesion | null> { return this.usuarioActual$.asObservable(); }
  get usuarioActual(): UsuarioSesion | null { return this.usuarioActual$.getValue(); }
  get estaAutenticado(): boolean { return !!this.usuarioActual$.getValue(); }
  get esAdmin(): boolean { return esRolAdmin(this.usuarioActual?.rol ?? ''); }
  get puedeGestionarAdmin(): boolean { return puedeGestionarPanelAdmin(this.usuarioActual?.rol ?? ''); }
  get sesionActual(): UsuarioSesion | null { return this.usuarioActual$.getValue(); }
  obtenerSesion(): UsuarioSesion | null { return this.usuarioActual$.getValue(); }

  login(email: string, password: string): Observable<UsuarioSesion> {
    return this.http.post<LoginResponse>(`${this.AUTH_API}/token`, { email, password }).pipe(
      map(res => this.construirSesionDesdeToken(res.token, email)),
      tap(u => this.guardarSesion(u)),
      catchError(err => throwError(() => new Error(this.extraerMensajeError(err, 'Correo o contraseña incorrectos'))))
    );
  }

  register(email: string, password: string, nombre: string): Observable<any> {
    return this.http.post<RegisterResponse>(`${this.AUTH_API}/register`, {
      email,
      password,
      fullName: nombre,
      name: nombre,
      rol: 'Usuario'
    }).pipe(
      catchError(err => throwError(() => new Error(this.extraerMensajeError(err, 'No se pudo crear la cuenta'))))
    );
  }

  recuperarContrasena(email: string): Observable<void> {
    return this.http.post<void>(`${this.AUTH_API}/reset-password`, { email }).pipe(
      catchError(() => throwError(() => new Error('Recuperación no disponible aún')))
    );
  }

  registrarAsistencia(
    tipo: 'entrada' | 'salida',
    fotoBase64?: string,
    ubicacion?: { direccion: string; lat: number; lng: number }
  ): Observable<{ exito: boolean; status?: string; mensaje?: string }> {
    const usuario = this.usuarioActual$.getValue();
    if (!usuario) return of({ exito: false, mensaje: 'Sin sesión activa' });

    const token = usuario.token ?? usuario.idToken ?? '';
    if (!token) return of({ exito: false, mensaje: 'Token de sesión inválido' });

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post<any>(
      `${this.API}/attendance/register`,
      {
        UserId: usuario.uid,
        EventType: tipo,
        CaptureUrl: fotoBase64,
        Ubicacion: ubicacion
      },
      { headers }
    ).pipe(
      map(resp => ({
        exito: resp?.success ?? true,
        status: resp?.status,
        mensaje: resp?.message ?? `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`
      })),
      catchError(err => of({ exito: false, mensaje: this.extraerMensajeError(err, `Error al registrar ${tipo}`) }))
    );
  }

  /**
   * Registra asistencia CON verificación facial vía TPU
   * Requiere que el empleado tenga foto de referencia guardada
   */
  registrarAsistenciaConVerificacion(
    tipo: 'entrada' | 'salida',
    fotoBase64: string,
    ubicacion?: { direccion?: string; ciudad?: string; pais?: string; lat?: number; lng?: number },
    strictMode = false
  ): Observable<{ exito: boolean; verified?: boolean; distance?: number; confidence?: number; status?: string; mensaje?: string }> {
    const usuario = this.usuarioActual$.getValue();
    if (!usuario) return of({ exito: false, mensaje: 'Sin sesión activa' });

    const token = usuario.token ?? usuario.idToken ?? '';
    if (!token) return of({ exito: false, mensaje: 'Token de sesión inválido' });

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post<any>(
      `${this.API}/attendance/verify-face`,
      {
        UserId: usuario.uid,
        CapturePhotoBase64: fotoBase64,
        EventType: tipo,
        Ubicacion: ubicacion,
        StrictMode: strictMode
      },
      { headers }
    ).pipe(
      map(resp => ({
        exito: resp?.success ?? false,
        verified: resp?.verified ?? resp?.success ?? true,
        distance: resp?.distance,
        confidence: resp?.confidence,
        status: resp?.status,
        mensaje: resp?.message ?? 'Verificación facial completada'
      })),
      catchError(err => {
        const errorMsg = this.extraerMensajeError(err, 'Error en verificación facial');
        return of({ exito: false, verified: false, mensaje: errorMsg });
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
    this.usuarioActual$.next(null);
    this.router.navigate(['/login']);
  }

  private guardarSesion(u: UsuarioSesion): void {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(u));
    this.usuarioActual$.next(u);
  }

  private restaurarSesion(): void {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      if (raw) this.usuarioActual$.next(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem(this.SESSION_KEY);
    }
  }

  private construirSesionDesdeToken(token: string, emailFallback: string): UsuarioSesion {
    const payload = this.parseJwt(token);
    const uid =
      payload?.sub ??
      payload?.nameid ??
      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ??
      '';

    const email =
      payload?.email ??
      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ??
      emailFallback;

    const rol =
      payload?.role ??
      payload?.rol ??
      payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
      'Usuario';

    const nombre =
      payload?.nombre ??
      payload?.name ??
      payload?.unique_name ??
      email.split('@')[0];

    return {
      uid,
      email,
      nombre,
      rol: normalizarRolSistema(rol),
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
}
