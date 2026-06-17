import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../services/auth.service';
import { AttendanceService } from '../../../services/attendance.service';
import { EmployeeService } from '../../../services/employee.service';
import { AttendanceStatistics } from '../../../models/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatDividerModule, MatProgressBarModule
  ],
  template: `
<div class="admin-layout">

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-brand"><mat-icon>fingerprint</mat-icon><span>Smart Access Edge</span></div>
    <div class="sidebar-role">{{ auth.usuarioActual?.rol }}</div>
    <nav class="sidebar-nav">
      <button mat-button class="nav-item active"><mat-icon>dashboard</mat-icon> Dashboard</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/employees'])"><mat-icon>group</mat-icon> Empleados</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/users'])"><mat-icon>manage_accounts</mat-icon> Usuarios</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/catalogs'])"><mat-icon>badge</mat-icon> Cargos y Departamentos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/turnos'])"><mat-icon>schedule</mat-icon> Turnos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/attendance'])"><mat-icon>fact_check</mat-icon> Registros del Día</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/reports'])"><mat-icon>bar_chart</mat-icon> Reportes</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/settings'])"><mat-icon>settings</mat-icon> Configuración</button>
    </nav>
    <button mat-button class="nav-item logout" (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
  </aside>

  <!-- Main -->
  <main class="main-content">

    <div class="page-header">
      <div>
        <h1>Dashboard <span class="accent">Administrativo</span></h1>
        <p class="fecha-txt">{{ fechaHoy }}</p>
      </div>
      <button mat-raised-button color="primary" (click)="cargarDatos()">
        <mat-icon>refresh</mat-icon> Actualizar
      </button>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" *ngIf="stats">
      <mat-card class="kpi-card kpi-total">
        <mat-icon>group</mat-icon>
        <div class="kpi-num">{{ stats.totalEmpleados }}</div>
        <div class="kpi-label">Empleados activos</div>
      </mat-card>
      <mat-card class="kpi-card kpi-presentes">
        <mat-icon>check_circle</mat-icon>
        <div class="kpi-num">{{ stats.presentes }}</div>
        <div class="kpi-label">Presentes hoy</div>
      </mat-card>
      <mat-card class="kpi-card kpi-tardanza">
        <mat-icon>schedule</mat-icon>
        <div class="kpi-num">{{ stats.tardanzas }}</div>
        <div class="kpi-label">Tardanzas hoy</div>
      </mat-card>
      <mat-card class="kpi-card kpi-ausentes">
        <mat-icon>person_off</mat-icon>
        <div class="kpi-num">{{ stats.ausentes }}</div>
        <div class="kpi-label">Ausentes hoy</div>
      </mat-card>
    </div>

    <!-- % Asistencia global -->
    <mat-card class="asistencia-card" *ngIf="stats">
      <div class="asistencia-header">
        <h3>Asistencia Global Hoy</h3>
        <span class="porcentaje-txt">{{ stats.porcentajeAsistencia }}%</span>
      </div>
      <mat-progress-bar mode="determinate" [value]="stats.porcentajeAsistencia"
                        [color]="stats.porcentajeAsistencia >= 80 ? 'primary' : 'warn'">
      </mat-progress-bar>
      <p class="asistencia-sub">{{ stats.presentes }} de {{ stats.totalEmpleados }} empleados registrados</p>
    </mat-card>

    <!-- Gráficos lado a lado -->
    <div class="charts-row">

      <!-- Gráfico de barras por departamento -->
      <mat-card class="chart-card">
        <h3>Asistencia por Departamento</h3>
        <div class="bar-chart" *ngIf="stats">
          <div *ngFor="let dept of stats.porDepartamento" class="bar-row">
            <div class="bar-label">{{ dept.departamento }}</div>
            <div class="bar-container">
              <div class="bar-fill bar-puntual"
                   [style.width.%]="calcPct(dept.presentes, dept.total)">
              </div>
              <div class="bar-fill bar-tardanza"
                   [style.width.%]="calcPct(dept.tardanzas, dept.total)">
              </div>
            </div>
            <div class="bar-nums">
              <span class="b-p">{{ dept.presentes }}P</span>
              <span class="b-t">{{ dept.tardanzas }}T</span>
              <span class="b-a">{{ dept.ausentes }}A</span>
            </div>
          </div>
        </div>
      </mat-card>

      <!-- Gráfico circular (distribución estados) -->
      <mat-card class="chart-card donut-card">
        <h3>Distribución de Estados</h3>
        <div class="donut-wrapper" *ngIf="stats">
          <svg viewBox="0 0 120 120" class="donut-svg">
            <circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" stroke-width="20"/>
            <circle cx="60" cy="60" r="45" fill="none" stroke="#22c55e" stroke-width="20"
                    [attr.stroke-dasharray]="donutPresentes + ' ' + (283 - donutPresentes)"
                    stroke-dashoffset="70" stroke-linecap="round"/>
            <circle cx="60" cy="60" r="45" fill="none" stroke="#f59e0b" stroke-width="20"
                    [attr.stroke-dasharray]="donutTardanzas + ' ' + (283 - donutTardanzas)"
                    [attr.stroke-dashoffset]="70 - donutPresentes" stroke-linecap="round"/>
            <text x="60" y="60" text-anchor="middle" dy=".4em" class="donut-label">
              {{ stats.porcentajeAsistencia }}%
            </text>
          </svg>
          <div class="donut-legend">
            <div class="legend-item"><span class="dot dot-verde"></span> Presentes ({{ stats.presentes }})</div>
            <div class="legend-item"><span class="dot dot-amarillo"></span> Tardanzas ({{ stats.tardanzas }})</div>
            <div class="legend-item"><span class="dot dot-rojo"></span> Ausentes ({{ stats.ausentes }})</div>
          </div>
        </div>
      </mat-card>
    </div>

    <!-- Tendencia semanal -->
    <mat-card class="chart-card tendencia-card" *ngIf="stats">
      <h3>Tendencia de Asistencia (Esta Semana)</h3>
      <div class="tendencia-chart">
        <div *ngFor="let t of stats.tendenciaSemanal" class="tendencia-col">
          <div class="tendencia-bar-wrap">
            <div class="tendencia-bar" [style.height.%]="t.porcentaje"
                 [ngClass]="t.porcentaje >= 80 ? 'bar-ok' : t.porcentaje >= 60 ? 'bar-medio' : 'bar-bajo'">
            </div>
          </div>
          <div class="tendencia-label">{{ t.fecha }}</div>
          <div class="tendencia-pct">{{ t.porcentaje }}%</div>
        </div>
      </div>
    </mat-card>

    <!-- Accesos rápidos -->
    <div class="quick-links">
      <button mat-raised-button color="primary" (click)="router.navigate(['/admin/employees/new'])">
        <mat-icon>person_add</mat-icon> Nuevo Empleado
      </button>
      <button mat-stroked-button (click)="router.navigate(['/admin/attendance'])">
        <mat-icon>fact_check</mat-icon> Ver Registros
      </button>
      <button mat-stroked-button (click)="router.navigate(['/admin/reports'])">
        <mat-icon>download</mat-icon> Exportar Reporte
      </button>
    </div>

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
    .fecha-txt { margin:.25rem 0 0; color:#64748b; font-size:.88rem; }

    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1rem; }
    .kpi-card { border-radius:1rem !important; padding:1.5rem; text-align:center; border-left:4px solid transparent; }
    .kpi-total    { border-left-color:#3b82f6; }
    .kpi-presentes{ border-left-color:#22c55e; }
    .kpi-tardanza { border-left-color:#f59e0b; }
    .kpi-ausentes { border-left-color:#ef4444; }
    .kpi-card mat-icon { font-size:2rem; margin-bottom:.5rem; color:#64748b; }
    .kpi-num   { font-size:2.2rem; font-weight:800; color:#0f172a; }
    .kpi-label { font-size:.82rem; color:#64748b; }

    .asistencia-card { border-radius:1rem !important; padding:1.5rem; }
    .asistencia-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .asistencia-header h3 { margin:0; }
    .porcentaje-txt { font-size:1.4rem; font-weight:700; color:#2e7d32; }
    .asistencia-sub { margin:.75rem 0 0; font-size:.85rem; color:#64748b; }

    .charts-row { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
    @media (max-width:900px) { .charts-row { grid-template-columns:1fr; } }

    .chart-card { border-radius:1rem !important; padding:1.5rem; }
    .chart-card h3 { margin:0 0 1.5rem; color:#0f172a; font-size:1rem; }

    .bar-chart { display:flex; flex-direction:column; gap:1rem; }
    .bar-row { display:flex; align-items:center; gap: 0.75rem; }
    .bar-label { width:120px; font-size:.82rem; color:#475569; flex-shrink:0; }
    .bar-container { flex:1; height:12px; background:#e2e8f0; border-radius:999px; overflow:hidden; display:flex; }
    .bar-fill { height:100%; border-radius:999px; }
    .bar-puntual  { background:#22c55e; }
    .bar-tardanza { background:#f59e0b; }
    .bar-nums { display:flex; gap:.5rem; margin-left:.75rem; font-size:.75rem; }
    .b-p { color:#15803d; font-weight:600; }
    .b-t { color:#b45309; font-weight:600; }
    .b-a { color:#b91c1c; font-weight:600; }

    .donut-card { }
    .donut-wrapper { display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap; }
    .donut-svg { width:140px; height:140px; flex-shrink:0; }
    .donut-label { font-size:16px; font-weight:700; fill:#0f172a; }
    .donut-legend { display:flex; flex-direction:column; gap:.5rem; }
    .legend-item { display:flex; align-items:center; gap:.5rem; font-size:.85rem; color:#475569; }
    .dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
    .dot-verde   { background:#22c55e; }
    .dot-amarillo{ background:#f59e0b; }
    .dot-rojo    { background:#ef4444; }

    .tendencia-card { }
    .tendencia-chart { display:flex; gap:.75rem; align-items:flex-end; justify-content:center; height:140px; padding-bottom:2rem; position:relative; }
    .tendencia-col { display:flex; flex-direction:column; align-items:center; gap:.25rem; flex:1; }
    .tendencia-bar-wrap { flex:1; width:100%; display:flex; align-items:flex-end; }
    .tendencia-bar { width:100%; border-radius:.5rem .5rem 0 0; min-height:4px; }
    .bar-ok    { background:#22c55e; }
    .bar-medio { background:#f59e0b; }
    .bar-bajo  { background:#ef4444; }
    .tendencia-label { font-size:.75rem; color:#64748b; }
    .tendencia-pct   { font-size:.7rem; font-weight:600; color:#475569; }

    .quick-links { display:flex; gap:1rem; flex-wrap:wrap; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats: AttendanceStatistics | null = null;
  fechaHoy = '';

  constructor(
    public auth: AuthService,
    private attendance: AttendanceService,
    public router: Router
  ) {}

  ngOnInit() {
    this.fechaHoy = new Date().toLocaleDateString('es-HN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    this.cargarDatos();
  }

  cargarDatos() {
    this.attendance.getStatistics().subscribe(s => this.stats = s);
  }

  calcPct(parte: number, total: number): number {
    return total > 0 ? Math.round((parte / total) * 100) : 0;
  }

  get donutPresentes(): number {
    if (!this.stats) return 0;
    return Math.round((this.stats.presentes / Math.max(this.stats.totalEmpleados, 1)) * 283);
  }

  get donutTardanzas(): number {
    if (!this.stats) return 0;
    return Math.round((this.stats.tardanzas / Math.max(this.stats.totalEmpleados, 1)) * 283);
  }
}
