// ============================================================
// ATTENDANCE SERVICE — Solo backend, sin localStorage
// Todos los registros van a Firebase vía el backend .NET
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AttendanceRecord, AttendanceStatistics } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AttendanceService {

  private readonly API = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.usuarioActual?.token ?? this.auth.usuarioActual?.idToken ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private handleErr(op: string) {
    return (err: any): Observable<never> =>
      throwError(() => new Error(`[${op}] ${err?.error?.message ?? err?.message ?? 'Error de conexión'}`));
  }

  getToday(): Observable<AttendanceRecord[]> {
    return this.http.get<any[]>(`${this.API}/today`, { headers: this.headers() })
      .pipe(
        map((rows: any[]) => (rows ?? []).map(r => ({
          id: r.id,
          userId: r.userId ?? r.UserId ?? '',
          userName: r.userName ?? r.UserName ?? 'Empleado',
          employeeId: r.employeeId ?? r.userId ?? r.UserId ?? '',
          departamento: r.departamento ?? r.Departamento ?? r.department ?? r.Department ?? 'General',
          department: r.department ?? r.Department ?? r.departamento ?? r.Departamento ?? 'General',
          eventType: (r.eventType ?? r.EventType ?? r.tipo ?? r.Tipo ?? 'entrada') as 'entrada' | 'salida',
          scheduledTime: r.scheduledTime ?? r.ScheduledTime ?? '--:--',
          recordedTime: r.recordedTime ?? r.RecordedTime ?? '--:--',
          status: (r.status ?? r.Status ?? 'puntual') as 'puntual' | 'tardanza' | 'ausente',
          captureUrl: r.captureUrl ?? r.CaptureUrl,
          timestamp: r.timestamp ?? r.Timestamp
        } as AttendanceRecord))),
        catchError(this.handleErr('getToday'))
      );
  }

  getByUser(userId: string, dias = 30): Observable<AttendanceRecord[]> {
    return this.http.get<any[]>(`${this.API}/user/${userId}?dias=${dias}`, { headers: this.headers() })
      .pipe(
        map((rows: any[]) => (rows ?? []).map(r => ({
          id: r.id,
          userId: r.userId ?? r.UserId ?? userId,
          userName: r.userName ?? r.UserName ?? 'Empleado',
          employeeId: r.employeeId ?? r.userId ?? r.UserId ?? userId,
          departamento: r.departamento ?? r.Departamento ?? r.department ?? r.Department ?? 'General',
          department: r.department ?? r.Department ?? r.departamento ?? r.Departamento ?? 'General',
          eventType: (r.eventType ?? r.EventType ?? r.tipo ?? r.Tipo ?? 'entrada') as 'entrada' | 'salida',
          scheduledTime: r.scheduledTime ?? r.ScheduledTime ?? '--:--',
          recordedTime: r.recordedTime ?? r.RecordedTime ?? '--:--',
          status: (r.status ?? r.Status ?? 'puntual') as 'puntual' | 'tardanza' | 'ausente',
          captureUrl: r.captureUrl ?? r.CaptureUrl,
          timestamp: r.timestamp ?? r.Timestamp
        } as AttendanceRecord))),
        catchError(this.handleErr('getByUser'))
      );
  }

  getStatistics(periodo: 'semana' | 'mes' = 'semana'): Observable<AttendanceStatistics> {
    return this.http.get<AttendanceStatistics>(
      `${environment.apiUrl}/reports/statistics?periodo=${periodo}`,
      { headers: this.headers() }
    ).pipe(catchError(this.handleErr('getStatistics')));
  }

  checkDuplicado(userId: string): Observable<boolean> {
    return this.http.get<{ checkedIn: boolean }>(
      `${environment.apiUrl}/auth/check-status/${userId}`,
      { headers: this.headers() }
    ).pipe(
      map((r: { checkedIn: boolean }) => r.checkedIn),
      catchError(this.handleErr('checkDuplicado'))
    );
  }
}
