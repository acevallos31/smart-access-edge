// ============================================================
// REPORT SERVICE — Solo backend, sin localStorage
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AttendanceStatistics, AttendanceRecord } from '../models/models';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ReportService {

  private readonly API = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.usuarioActual?.token ?? this.auth.usuarioActual?.idToken ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getStatistics(
    periodo: 'semana' | 'mes' | 'custom' = 'semana',
    desde?: string,
    hasta?: string
  ): Observable<AttendanceStatistics> {
    const params = new URLSearchParams({ periodo });
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);

    return this.http.get<AttendanceStatistics>(
      `${this.API}/statistics?${params.toString()}`,
      { headers: this.headers() }
    ).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? 'Error al obtener estadísticas')
      ))
    );
  }

  getRecords(
    periodo: 'semana' | 'mes' | 'custom',
    desde?: string,
    hasta?: string,
    departamento?: string,
    userId?: string,
    turnoId?: string
  ): Observable<AttendanceRecord[]> {
    const params = new URLSearchParams({ periodo });
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (departamento) params.set('departamento', departamento);
    if (userId) params.set('userId', userId);
    if (turnoId) params.set('turnoId', turnoId);

    return this.http.get<any[]>(`${this.API}/records?${params.toString()}`, { headers: this.headers() }).pipe(
      map(rows => (rows ?? []).map(r => ({
        id: r.id,
        userId: r.userId ?? r.UserId ?? '',
        userName: r.userName ?? r.UserName ?? 'Empleado',
        employeeId: r.employeeId ?? r.userId ?? r.UserId ?? '',
        departamento: r.departamento ?? r.Departamento ?? r.department ?? r.Department ?? 'General',
        department: r.department ?? r.Department ?? r.departamento ?? r.Departamento ?? 'General',
        turnoId: r.turnoId ?? r.TurnoId,
        turnoNombre: r.turnoNombre ?? r.TurnoNombre,
        eventType: (r.eventType ?? r.EventType ?? r.tipo ?? r.Tipo ?? 'entrada') as 'entrada' | 'salida',
        scheduledTime: r.scheduledTime ?? r.ScheduledTime ?? '--:--',
        recordedTime: r.recordedTime ?? r.RecordedTime ?? '--:--',
        status: (r.status ?? r.Status ?? 'puntual') as 'puntual' | 'tardanza' | 'ausente' | 'extra' | 'fuera de horario',
        captureUrl: r.captureUrl ?? r.CaptureUrl,
        lugarRegistro: r.lugarRegistro ?? r.LugarRegistro ?? '',
        ciudadRegistro: r.ciudadRegistro ?? r.CiudadRegistro ?? '',
        paisRegistro: r.paisRegistro ?? r.PaisRegistro ?? '',
        latitudRegistro: r.latitudRegistro ?? r.LatitudRegistro ?? '',
        longitudRegistro: r.longitudRegistro ?? r.LongitudRegistro ?? '',
        timestamp: r.timestamp ?? r.Timestamp
      } as AttendanceRecord))),
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? 'Error al obtener registros de reporte')
      ))
    );
  }

  getExportData(
    periodo: 'semana' | 'mes' | 'custom',
    desde?: string,
    hasta?: string,
    departamento?: string,
    userId?: string,
    turnoId?: string
  ): Observable<AttendanceRecord[]> {
    const params = new URLSearchParams({ periodo });
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (departamento) params.set('departamento', departamento);
    if (userId) params.set('userId', userId);
    if (turnoId) params.set('turnoId', turnoId);

    return this.http.get<any[]>(`${this.API}/export?${params.toString()}`, { headers: this.headers() }).pipe(
      map(rows => (rows ?? []).map(r => ({
        id: r.id,
        userId: r.userId ?? r.UserId ?? '',
        userName: r.userName ?? r.UserName ?? 'Empleado',
        employeeId: r.employeeId ?? r.userId ?? r.UserId ?? '',
        departamento: r.departamento ?? r.Departamento ?? r.department ?? r.Department ?? 'General',
        department: r.department ?? r.Department ?? r.departamento ?? r.Departamento ?? 'General',
        turnoId: r.turnoId ?? r.TurnoId,
        turnoNombre: r.turnoNombre ?? r.TurnoNombre,
        eventType: (r.eventType ?? r.EventType ?? r.tipo ?? r.Tipo ?? 'entrada') as 'entrada' | 'salida',
        scheduledTime: r.scheduledTime ?? r.ScheduledTime ?? '--:--',
        recordedTime: r.recordedTime ?? r.RecordedTime ?? '--:--',
        status: (r.status ?? r.Status ?? 'puntual') as 'puntual' | 'tardanza' | 'ausente' | 'extra' | 'fuera de horario',
        captureUrl: r.captureUrl ?? r.CaptureUrl,
        lugarRegistro: r.lugarRegistro ?? r.LugarRegistro ?? '',
        ciudadRegistro: r.ciudadRegistro ?? r.CiudadRegistro ?? '',
        paisRegistro: r.paisRegistro ?? r.PaisRegistro ?? '',
        latitudRegistro: r.latitudRegistro ?? r.LatitudRegistro ?? '',
        longitudRegistro: r.longitudRegistro ?? r.LongitudRegistro ?? '',
        timestamp: r.timestamp ?? r.Timestamp
      } as AttendanceRecord))),
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? 'Error al exportar')
      ))
    );
  }

  exportToCsv(data: AttendanceRecord[], filename = 'reporte-asistencia.csv'): void {
    const cols = ['Empleado','Departamento','Tipo','Hora Programada','Hora Registrada','Estado','Lugar','Ciudad','Pais','Fecha'];
    const rows = data.map(r => [
      `"${r.userName}"`,`"${r.departamento}"`,`"${r.eventType}"`,
      `"${r.scheduledTime}"`,`"${r.recordedTime}"`,`"${r.status}"`,
      `"${r.lugarRegistro ?? ''}"`,`"${r.ciudadRegistro ?? ''}"`,`"${r.paisRegistro ?? ''}"`,`"${r.timestamp}"`
    ]);
    const csv  = [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
