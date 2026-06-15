import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AttendanceStatistics, AttendanceRecord } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {

  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  // ── MODO DEMO ─────────────────────────────────────────────────────────────

  getStatisticsDemo(periodo: 'semana' | 'mes'): Observable<AttendanceStatistics> {
    const dias = periodo === 'mes' ? 30 : 7;
    const stats: AttendanceStatistics = {
      totalEmpleados:       12,
      registrosHoy:         9,
      puntuales:            7,
      tardanzas:            2,
      ausentes:             3,
      porcentajeAsistencia: 75,
      porDepartamento: [
        { departamento: 'TI',           total: 4, presentes: 4, tardanzas: 0, ausentes: 0, porcentaje: 100 },
        { departamento: 'Recursos Humanos', total: 3, presentes: 2, tardanzas: 1, ausentes: 1, porcentaje: 66.7 },
        { departamento: 'Ventas',        total: 3, presentes: 2, tardanzas: 1, ausentes: 1, porcentaje: 66.7 },
        { departamento: 'Administración',total: 2, presentes: 1, tardanzas: 0, ausentes: 1, porcentaje: 50 }
      ],
      tendencia: Array.from({ length: dias }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (dias - 1 - i));
        const p = Math.floor(Math.random() * 5) + 6;
        const t = Math.floor(Math.random() * 3);
        return {
          fecha:     `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`,
          presentes: p,
          tardanzas: t,
          ausentes:  12 - p
        };
      })
    };
    return of(stats);
  }

  // ── MODO REAL (descomentar para conectar al backend) ──────────────────────
  /*
  getStatistics(periodo: 'semana' | 'mes'): Observable<AttendanceStatistics> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<AttendanceStatistics>(
      `${this.apiUrl}/statistics?periodo=${periodo}`, { headers }
    );
  }

  getExportData(periodo: 'semana' | 'mes', departamento?: string): Observable<AttendanceRecord[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    let url = `${this.apiUrl}/export?periodo=${periodo}`;
    if (departamento) url += `&departamento=${encodeURIComponent(departamento)}`;
    return this.http.get<AttendanceRecord[]>(url, { headers });
  }
  */

  // ── HELPER: exportar a CSV ─────────────────────────────────────────────────
  exportToCsv(data: AttendanceRecord[], filename = 'reporte-asistencia.csv'): void {
    const headers = ['Empleado', 'Departamento', 'Tipo', 'Hora Programada', 'Hora Registrada', 'Estado', 'Fecha'];
    const rows = data.map(r => [
      `"${r.userName}"`,
      `"${r.departamento}"`,
      `"${r.eventType}"`,
      `"${r.scheduledTime}"`,
      `"${r.recordedTime}"`,
      `"${r.status}"`,
      `"${r.timestamp}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
