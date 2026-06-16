// ============================================================
// REPORT SERVICE — Solo backend, sin localStorage
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AttendanceStatistics, AttendanceRecord } from '../models/models';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ReportService {

  private readonly API = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.usuarioActual?.idToken ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getStatistics(periodo: 'semana' | 'mes' = 'semana'): Observable<AttendanceStatistics> {
    return this.http.get<AttendanceStatistics>(
      `${this.API}/statistics?periodo=${periodo}`,
      { headers: this.headers() }
    ).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? 'Error al obtener estadísticas')
      ))
    );
  }

  getExportData(periodo: 'semana' | 'mes', departamento?: string): Observable<AttendanceRecord[]> {
    let url = `${this.API}/export?periodo=${periodo}`;
    if (departamento) url += `&departamento=${encodeURIComponent(departamento)}`;
    return this.http.get<AttendanceRecord[]>(url, { headers: this.headers() }).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? 'Error al exportar')
      ))
    );
  }

  exportToCsv(data: AttendanceRecord[], filename = 'reporte-asistencia.csv'): void {
    const cols = ['Empleado','Departamento','Tipo','Hora Programada','Hora Registrada','Estado','Fecha'];
    const rows = data.map(r => [
      `"${r.userName}"`,`"${r.departamento}"`,`"${r.eventType}"`,
      `"${r.scheduledTime}"`,`"${r.recordedTime}"`,`"${r.status}"`,`"${r.timestamp}"`
    ]);
    const csv  = [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
