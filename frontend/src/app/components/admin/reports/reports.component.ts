import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../services/auth.service';
import { ReportService } from '../../../services/report.service';
import { AttendanceRecord, AttendanceStatistics } from '../../../models/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatSelectModule, MatFormFieldModule,
    MatTabsModule, MatTooltipModule, MatInputModule
  ],
  template: `
<div class="admin-layout">
  <aside class="sidebar">
    <div class="sidebar-brand"><mat-icon>fingerprint</mat-icon><span>Smart Access Edge</span></div>
    <div class="sidebar-role">{{ auth.usuarioActual?.rol }}</div>
    <nav class="sidebar-nav">
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/dashboard'])"><mat-icon>dashboard</mat-icon> Dashboard</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/employees'])"><mat-icon>group</mat-icon> Empleados</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/users'])"><mat-icon>manage_accounts</mat-icon> Usuarios</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/catalogs'])"><mat-icon>badge</mat-icon> Cargos y Departamentos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/turnos'])"><mat-icon>schedule</mat-icon> Turnos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/attendance'])"><mat-icon>fact_check</mat-icon> Registros</button>
      <button mat-button class="nav-item active"><mat-icon>bar_chart</mat-icon> Reportes</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/settings'])"><mat-icon>settings</mat-icon> Configuración</button>
    </nav>
    <button mat-button class="nav-item logout" (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
  </aside>

  <main class="main-content">
    <div class="page-header">
      <h1>Reportes y <span class="accent">Análisis</span></h1>
      <div class="header-actions">
        <mat-form-field appearance="outline" class="periodo-select">
          <mat-label>Período</mat-label>
          <mat-select [(ngModel)]="periodo" (ngModelChange)="onPeriodoChange()">
            <mat-option value="semana">Esta semana</mat-option>
            <mat-option value="mes">Este mes</mat-option>
            <mat-option value="custom">Rango personalizado</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field *ngIf="periodo === 'custom'" appearance="outline" class="date-field">
          <mat-label>Desde</mat-label>
          <input matInput type="date" [(ngModel)]="desde">
        </mat-form-field>

        <mat-form-field *ngIf="periodo === 'custom'" appearance="outline" class="date-field">
          <mat-label>Hasta</mat-label>
          <input matInput type="date" [(ngModel)]="hasta">
        </mat-form-field>

        <button mat-stroked-button (click)="cargar()"><mat-icon>refresh</mat-icon> Aplicar</button>
        <button mat-raised-button color="primary" (click)="exportarCSV()">
          <mat-icon>download</mat-icon> Exportar
        </button>
      </div>
    </div>

    <p class="range-label" *ngIf="stats?.desde && stats?.hasta">
      Rango aplicado: {{ stats?.desde }} a {{ stats?.hasta }}
    </p>

    <mat-tab-group *ngIf="stats">
      <mat-tab label="Resumen">
        <div class="tab-content">
          <div class="charts-row">
            <mat-card class="chart-card">
              <h3>Distribución Global de Estados</h3>
              <div class="donut-wrapper">
                <svg viewBox="0 0 120 120" class="donut-svg">
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" stroke-width="20"/>
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#22c55e" stroke-width="20"
                          [attr.stroke-dasharray]="donutPresentes + ' ' + (283 - donutPresentes)"
                          stroke-dashoffset="70"/>
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#f59e0b" stroke-width="20"
                          [attr.stroke-dasharray]="donutTardanzas + ' ' + (283 - donutTardanzas)"
                          [attr.stroke-dashoffset]="70 - donutPresentes"/>
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#ef4444" stroke-width="20"
                          [attr.stroke-dasharray]="donutAusentes + ' ' + (283 - donutAusentes)"
                          [attr.stroke-dashoffset]="70 - donutPresentes - donutTardanzas"/>
                  <text x="60" y="60" text-anchor="middle" dy=".4em" class="donut-label">
                    {{ stats.porcentajeAsistencia }}%
                  </text>
                </svg>
                <div class="donut-legend">
                  <div class="legend-item"><span class="dot dot-verde"></span> Presentes: {{ stats.presentes }}</div>
                  <div class="legend-item"><span class="dot dot-amarillo"></span> Tardanzas: {{ stats.tardanzas }}</div>
                  <div class="legend-item"><span class="dot dot-rojo"></span> Ausentes: {{ stats.ausentes }}</div>
                </div>
              </div>
            </mat-card>

            <mat-card class="chart-card">
              <h3>Asistencia por Departamento</h3>
              <div class="bar-chart">
                <div *ngFor="let d of stats.porDepartamento" class="bar-row">
                  <div class="bar-label">{{ d.departamento }}</div>
                  <div class="bar-track">
                    <div class="bar-fill bar-ok" [style.width.%]="calcPct(d.presentes, d.total)"></div>
                    <div class="bar-fill bar-warn" [style.width.%]="calcPct(d.tardanzas, d.total)"></div>
                    <div class="bar-fill bar-err" [style.width.%]="calcPct(d.ausentes, d.total)"></div>
                  </div>
                  <span class="bar-pct">{{ calcPct(d.presentes + d.tardanzas, d.total) }}%</span>
                </div>
              </div>
            </mat-card>
          </div>

          <mat-card class="chart-card wide-card">
            <h3>Tendencia de Asistencia</h3>
            <div class="tendencia-chart">
              <div *ngFor="let t of stats.tendenciaSemanal" class="tendencia-col">
                <div class="tend-bar-wrap">
                  <div class="tend-bar" [style.height.%]="t.porcentaje"
                       [ngClass]="t.porcentaje >= 80 ? 'bar-ok' : t.porcentaje >= 60 ? 'bar-warn' : 'bar-err'">
                    <span class="tend-val">{{ t.porcentaje }}%</span>
                  </div>
                </div>
                <div class="tend-label">{{ t.fecha }}</div>
              </div>
            </div>
          </mat-card>
        </div>
      </mat-tab>

      <mat-tab label="Tabla Detallada">
        <div class="tab-content">
          <mat-card class="table-card">
            <div class="table-header-row">
              <h3>Registros del rango</h3>
              <span>{{ registros.length }} registros</span>
            </div>
            <table mat-table [dataSource]="registros" class="full-table">
              <ng-container matColumnDef="fecha">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let r">{{ formatFecha(r.timestamp) }}</td>
              </ng-container>
              <ng-container matColumnDef="empleado">
                <th mat-header-cell *matHeaderCellDef>Empleado</th>
                <td mat-cell *matCellDef="let r">{{ r.userName }}</td>
              </ng-container>
              <ng-container matColumnDef="departamento">
                <th mat-header-cell *matHeaderCellDef>Departamento</th>
                <td mat-cell *matCellDef="let r">{{ r.departamento }}</td>
              </ng-container>
              <ng-container matColumnDef="tipo">
                <th mat-header-cell *matHeaderCellDef>Tipo</th>
                <td mat-cell *matCellDef="let r">{{ r.eventType }}</td>
              </ng-container>
              <ng-container matColumnDef="programada">
                <th mat-header-cell *matHeaderCellDef>Hora programada</th>
                <td mat-cell *matCellDef="let r">{{ r.scheduledTime }}</td>
              </ng-container>
              <ng-container matColumnDef="registrada">
                <th mat-header-cell *matHeaderCellDef>Hora registrada</th>
                <td mat-cell *matCellDef="let r">{{ r.recordedTime }}</td>
              </ng-container>
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let r">
                  <span class="badge" [ngClass]="estadoClass(r.status)">
                    {{ r.status }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="lugar">
                <th mat-header-cell *matHeaderCellDef>Lugar</th>
                <td mat-cell *matCellDef="let r">{{ r.lugarRegistro || '--' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="tablaDetalleCols"></tr>
              <tr mat-row *matRowDef="let row; columns: tablaDetalleCols;"></tr>
            </table>
          </mat-card>
        </div>
      </mat-tab>
    </mat-tab-group>
  </main>
</div>
  `,
  styles: [`
    .admin-layout { display:flex; min-height:100vh; background:#f1f5f9; font-family:'Segoe UI',sans-serif; }
    .sidebar { width:260px; background:#0f172a; color:#f1f5f9; display:flex; flex-direction:column; padding:1.5rem 1rem; gap:.25rem; }
    .sidebar-brand { display:flex; align-items:center; gap:.5rem; color:#6ee7b7; font-weight:700; font-size:1rem; padding:.5rem .75rem 0; }
    .sidebar-role { color:#64748b; font-size:.78rem; padding:0 .75rem 1.5rem; }
    .sidebar-nav { flex:1; display:flex; flex-direction:column; gap:.25rem; overflow:auto; }
    .nav-item { width:100%; justify-content:flex-start !important; color:#94a3b8 !important; border-radius:.75rem; padding:.5rem .75rem; gap:.75rem; }
    .nav-item:hover, .nav-item.active { background:rgba(110,231,183,.1) !important; color:#6ee7b7 !important; }
    .logout { color:#f87171 !important; margin-top:auto; }
    .main-content { flex:1; padding:2rem; display:flex; flex-direction:column; gap:1.5rem; }
    .page-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; }
    .page-header h1 { margin:0; font-size:1.7rem; color:#0f172a; }
    .accent { color:#2e7d32; }
    .header-actions { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; }
    .periodo-select { width:170px; }
    .date-field { width:160px; }
    .range-label { margin:0; color:#334155; font-size:.9rem; }
    .tab-content { padding:1.5rem 0; display:flex; flex-direction:column; gap:1.5rem; }
    .charts-row { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
    @media (max-width:900px) { .charts-row { grid-template-columns:1fr; } }
    .chart-card { border-radius:1rem !important; padding:1.5rem; }
    .wide-card { width:100%; }
    .chart-card h3 { margin:0 0 1.5rem; font-size:1rem; color:#0f172a; }
    .donut-wrapper { display:flex; align-items:center; gap:2rem; flex-wrap:wrap; justify-content:center; }
    .donut-svg { width:150px; height:150px; }
    .donut-label { font-size:16px; font-weight:700; fill:#0f172a; }
    .donut-legend { display:flex; flex-direction:column; gap:.6rem; }
    .legend-item { display:flex; align-items:center; gap:.5rem; font-size:.85rem; color:#475569; }
    .dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
    .dot-verde    { background:#22c55e; }
    .dot-amarillo { background:#f59e0b; }
    .dot-rojo     { background:#ef4444; }
    .bar-chart { display:flex; flex-direction:column; gap:1rem; }
    .bar-row { display:flex; align-items:center; gap:.75rem; }
    .bar-label { width:130px; font-size:.82rem; color:#475569; flex-shrink:0; }
    .bar-track { flex:1; height:14px; background:#e2e8f0; border-radius:999px; overflow:hidden; display:flex; }
    .bar-fill { height:100%; }
    .bar-ok   { background:#22c55e; }
    .bar-warn { background:#f59e0b; }
    .bar-err  { background:#ef4444; }
    .bar-pct { width:40px; font-size:.82rem; font-weight:600; color:#475569; text-align:right; }
    .tendencia-chart { display:flex; gap:.5rem; align-items:flex-end; height:180px; padding-bottom:2.5rem; }
    .tendencia-col { display:flex; flex-direction:column; align-items:center; flex:1; gap:.25rem; }
    .tend-bar-wrap { flex:1; width:100%; display:flex; align-items:flex-end; }
    .tend-bar { width:100%; border-radius:.5rem .5rem 0 0; min-height:4px; display:flex; align-items:flex-start; justify-content:center; }
    .tend-val { font-size:.65rem; color:#fff; font-weight:700; padding-top:2px; }
    .tend-label { font-size:.75rem; color:#64748b; }
    .table-card { border-radius:1rem !important; overflow:hidden; }
    .table-header-row { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; }
    .table-header-row h3 { margin:0; }
    .full-table { width:100%; }
    th.mat-header-cell { background:#f8fafc; font-weight:600; color:#475569; }
    .badge { font-size:.8rem; padding:.2rem .6rem; border-radius:999px; font-weight:600; display:inline-block; }
    .badge-p { background:#dcfce7; color:#15803d; }
    .badge-t { background:#fef3c7; color:#b45309; }
    .badge-a { background:#fee2e2; color:#b91c1c; }
    .badge-e { background:#dbeafe; color:#1d4ed8; }
    .badge-f { background:#ffedd5; color:#c2410c; }
  `]
})
export class ReportsComponent implements OnInit {
  stats: AttendanceStatistics | null = null;
  registros: AttendanceRecord[] = [];

  periodo: 'semana' | 'mes' | 'custom' = 'semana';
  desde = '';
  hasta = '';

  tablaDetalleCols = ['fecha', 'empleado', 'departamento', 'tipo', 'programada', 'registrada', 'estado', 'lugar'];

  constructor(
    public auth: AuthService,
    private reports: ReportService,
    public router: Router
  ) {}

  ngOnInit() {
    this.cargar();
  }

  onPeriodoChange() {
    if (this.periodo !== 'custom') {
      this.desde = '';
      this.hasta = '';
      this.cargar();
    }
  }

  cargar() {
    if (this.periodo === 'custom' && (!this.desde || !this.hasta)) {
      return;
    }

    this.reports.getStatistics(this.periodo, this.desde || undefined, this.hasta || undefined).subscribe({
      next: s => this.stats = s,
      error: err => console.error('[Reportes] Error cargando estadísticas:', err)
    });

    this.reports.getRecords(this.periodo, this.desde || undefined, this.hasta || undefined).subscribe({
      next: rows => this.registros = rows,
      error: err => console.error('[Reportes] Error cargando detalle:', err)
    });
  }

  calcPct(parte: number, total: number): number {
    return total > 0 ? Math.round((parte / total) * 100) : 0;
  }

  get donutPresentes() {
    return this.stats ? Math.round((this.stats.presentes / Math.max(this.stats.totalEmpleados, 1)) * 283) : 0;
  }

  get donutTardanzas() {
    return this.stats ? Math.round((this.stats.tardanzas / Math.max(this.stats.totalEmpleados, 1)) * 283) : 0;
  }

  get donutAusentes() {
    return this.stats ? Math.round((this.stats.ausentes / Math.max(this.stats.totalEmpleados, 1)) * 283) : 0;
  }

  formatFecha(value?: string): string {
    if (!value) return '--';
    const dt = new Date(value);
    if (isNaN(dt.getTime())) return value;
    return dt.toLocaleString('es-HN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  estadoClass(status: string): string {
    const value = (status ?? '').toLowerCase();
    if (value === 'puntual') return 'badge-p';
    if (value === 'tardanza') return 'badge-t';
    if (value === 'extra') return 'badge-e';
    if (value === 'fuera de horario') return 'badge-f';
    return 'badge-a';
  }

  exportarCSV() {
    this.reports.exportToCsv(this.registros, `reporte_${this.periodo}_${new Date().toISOString().split('T')[0]}.csv`);
  }
}
