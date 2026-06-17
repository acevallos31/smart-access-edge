// ============================================================
// SERVICIO DE AUTENTICACIÓN — Smart Access Edge
// Guarda sesión en localStorage (persistente entre recargas)
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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
    this.restaurarSesion();
  }

  get usuario$(): Observable<UsuarioSesion | null> { return this.usuarioActual$.asObservable(); }
  get usuarioActual(): UsuarioSesion | null         { return this.usuarioActual$.getValue(); }
  get estaAutenticado(): boolean                     { return this.usuarioActual$.getValue() !== null; }
  get esAdmin(): boolean {
    return esRolAdmin(this.usuarioActual$.getValue()?.rol ?? '');
  }

  // ── LOGIN ────────────────────────────────────────────────────
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
    );
  }

  // ── RECUPERAR CONTRASEÑA ──────────────────────────────────────
  recuperarContrasena(email: string): Observable<void> {
    console.log(`[DEMO] Recuperación simulada para: ${email}`);
    return of(undefined);
  }

  // ── LOGOUT ───────────────────────────────────────────────────
  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.usuarioActual$.next(null);
    this.router.navigate(['/login']);
  }

  // ── REGISTRAR ASISTENCIA (con persistencia real) ──────────────
  registrarAsistencia(
    tipo: 'entrada' | 'salida',
    fotoBase64?: string,
    ubicacion?: string
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
  }

  obtenerSesion(): UsuarioSesion | null { return this.usuarioActual$.getValue(); }
  get sesionActual(): UsuarioSesion | null { return this.usuarioActual$.getValue(); }

  private guardarSesion(u: UsuarioSesion): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(u));
    this.usuarioActual$.next(u);
  }

  private restaurarSesion(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) this.usuarioActual$.next(JSON.parse(raw));
    } catch { localStorage.removeItem(this.STORAGE_KEY); }
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
  }
}
