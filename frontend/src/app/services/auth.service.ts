// ============================================================
// SERVICIO DE AUTENTICACIÓN — Smart Access Edge
// Guarda sesión en localStorage (persistente entre recargas)
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { UsuarioSesion, esRolAdmin } from '../models/models';
import { StorageService } from './storage.service';
import { AttendanceRecord } from '../models/models';

export type { UsuarioSesion };

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly STORAGE_KEY = 'sae_usuario';
  private usuarioActual$ = new BehaviorSubject<UsuarioSesion | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router,
    private storage: StorageService
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
    // ══ MODO DEMO ═════════════════════════════════════════════
    const nombre = email.split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    const emailL = email.toLowerCase();
    let rol: UsuarioSesion['rol'] = 'Empleado';
    if      (emailL.includes('subjefe'))   rol = 'Subjefe';
    else if (emailL.includes('jefe'))      rol = 'Jefe';
    else if (emailL.includes('admin'))     rol = 'Administrador';
    else if (emailL.includes('contador'))  rol = 'Contador';
    else if (emailL.includes('asistente')) rol = 'Asistente del Jefe';

    const demo: UsuarioSesion = {
      uid: 'demo-' + email.replace(/[^a-z0-9]/gi, ''),
      email, nombre, rol,
      idToken: 'demo-token'
    };
    this.guardarSesion(demo);
    return of(demo);
    // ══ FIN MODO DEMO ═════════════════════════════════════════

    /* ── MODO REAL (Firebase) ─────────────────────────────────
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(cred => from(cred.user.getIdToken())),
      switchMap(idToken =>
        this.http.post<any>(`${environment.apiUrl}/api/auth/login-verificar`, { idToken }).pipe(
          map(perfil => ({ uid: perfil.userId, email, nombre: perfil.nombre, rol: perfil.rol, idToken } as UsuarioSesion)),
          tap(u => this.guardarSesion(u))
        )
      ),
      catchError(err => { throw this.traducirError(err.code); })
    );
    ──────────────────────────────────────────────────────────── */
  }

  // ── REGISTRO ─────────────────────────────────────────────────
  register(email: string, password: string, nombre: string): Observable<UsuarioSesion> {
    const demo: UsuarioSesion = {
      uid: 'demo-' + email.replace(/[^a-z0-9]/gi, ''),
      email, nombre, rol: 'Empleado', idToken: 'demo-token'
    };
    this.guardarSesion(demo);
    return of(demo);
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

    // Determinar status (puntual / tardanza)
    const ahora  = new Date();
    const hhmm   = `${ahora.getHours().toString().padStart(2,'0')}:${ahora.getMinutes().toString().padStart(2,'0')}`;
    const status: 'puntual' | 'tardanza' = this.calcularStatus(tipo, hhmm);

    const registro: AttendanceRecord = {
      id:            'rec-' + Date.now(),
      userId:        usuario.uid,
      userName:      usuario.nombre,
      employeeId:    usuario.uid,
      departamento:  'General',
      eventType:     tipo,
      scheduledTime: tipo === 'entrada' ? '08:00' : '17:00',
      recordedTime:  hhmm,
      status,
      captureUrl:    fotoBase64 ?? undefined,
      timestamp:     ahora.toISOString()
    };

    this.storage.agregarRegistro(registro);

    return of({ exito: true, status, mensaje: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada` });
  }

  private calcularStatus(tipo: 'entrada' | 'salida', hhmm: string): 'puntual' | 'tardanza' {
    const [h, m] = hhmm.split(':').map(Number);
    const minutos = h * 60 + m;
    if (tipo === 'entrada') return minutos <= 8 * 60 + 10 ? 'puntual' : 'tardanza';
    return minutos <= 17 * 60 + 10 ? 'puntual' : 'tardanza';
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

  private traducirError(code: string): string {
    const mapa: Record<string, string> = {
      'auth/user-not-found': 'No existe una cuenta con ese correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-email': 'El correo no tiene formato válido.',
    };
    return mapa[code] ?? 'Error de autenticación.';
  }
}
