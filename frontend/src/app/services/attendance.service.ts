// ============================================================
// ATTENDANCE SERVICE — llama al backend /api/attendance
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AttendanceRecord, AttendanceStatistics } from '../models/models';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AttendanceService {

  private readonly API = `${environment.apiUrl}/attendance`;

  constructor(
    private http:    HttpClient,
    private auth:    AuthService,
    private storage: StorageService
  ) {}

  private headers(): HttpHeaders {
    const token = this.auth.usuarioActual?.token ?? this.auth.usuarioActual?.idToken ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Registros del día ───────────────────────────────────────
  getToday(): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.API}/today`, { headers: this.headers() })
      .pipe(catchError(() => of(this.storage.getRegistrosHoy())));
  }

  // ── Historial por usuario ───────────────────────────────────
  getByUser(userId: string, dias = 30): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.API}/user/${userId}?dias=${dias}`, { headers: this.headers() })
      .pipe(catchError(() => of(this.storage.getRegistrosPorUsuario(userId))));
  }

  // ── Estadísticas ────────────────────────────────────────────
  getStatistics(): Observable<AttendanceStatistics> {
    return this.http.get<AttendanceStatistics>(`${environment.apiUrl}/reports/statistics`, { headers: this.headers() })
      .pipe(catchError(() => of(this.buildStatsLocal())));
  }

  // ── Verificar duplicado ─────────────────────────────────────
  checkDuplicado(userId: string): Observable<boolean> {
    return this.http.get<{ checkedIn: boolean }>(
      `${environment.apiUrl}/auth/check-status/${userId}`,
      { headers: this.headers() }
    ).pipe(
      map(r => r.checkedIn),
      catchError(() => of(this.storage.yaRegistroEntradaHoy(userId)))
    );
  }

  // ── Fallback local de estadísticas ─────────────────────────
  private buildStatsLocal(): AttendanceStatistics {
    const hoy     = this.storage.getRegistrosHoy();
    const entradas = hoy.filter(r => r.eventType === 'entrada');
    const total    = Math.max(entradas.length, 1);
    return {
      totalEmpleados: entradas.length,
      presentes:      entradas.filter(r => r.status === 'puntual').length,
      tardanzas:      entradas.filter(r => r.status === 'tardanza').length,
      ausentes:       0,
      porcentajeAsistencia: Math.round(entradas.filter(r => r.status === 'puntual').length / total * 100),
      porDepartamento: [],
      tendenciaSemanal: []
    };
  }
}
