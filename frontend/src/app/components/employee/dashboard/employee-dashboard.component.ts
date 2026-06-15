import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../services/auth.service';
import { AttendanceService } from '../../../services/attendance.service';
import { AttendanceRecord } from '../../../models/models';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatBadgeModule, MatDividerModule, MatProgressBarModule
  ],
  template: `
<div class="emp-layout">

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-brand">
      <mat-icon>fingerprint</mat-icon>
      <span>Smart Access Edge</span>
    </div>
    <nav class="sidebar-nav">
      <button mat-button class="nav-item active" routerLink="/employee/dashboard">
        <mat-icon>dashboard</mat-icon> Dashboard
      </button>
      <button mat-button class="nav-item" (click)="irCheckIn()">
        <mat-icon>how_to_reg</mat-icon> Registrar Asistencia
      </button>
      <button mat-button class="nav-item" (click)="irHistorial()">
        <mat-icon>history</mat-icon> Mi Historial
      </button>
    </nav>
    <button mat-button class="nav-item logout" (click)="cerrarSesion()">
      <mat-icon>logout</mat-icon> Cerrar sesión
    </button>
  </aside>

  <!-- Main -->
  <main class="main-content">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Buenos días, <span class="accent">{{ nombreUsuario }}</span> 👋</h1>
        <p class="fecha-txt">{{ fechaHoy }}</p>
      </div>
      <button mat-raised-button color="primary" (click)="irCheckIn()">
        <mat-icon>how_to_reg</mat-icon> Registrar Asistencia
      </button>
    </div>

    <!-- Estado del turno actual -->
    <mat-card class="turno-card" [ngClass]="'turno-' + estadoTurno">
      <div class="turno-info">
        <mat-icon class="turno-icon">{{ iconoTurno }}</mat-icon>
        <div>
          <h2 class="turno-titulo">{{ tituloTurno }}</h2>
          <p class="turno-sub">{{ subtituloTurno }}</p>
        </div>
      </div>
      <div *ngIf="ultimoRegistro" class="ultimo-reg">
        <mat-icon>access_time</mat-icon>
        <span>Último registro: <strong>{{ ultimoRegistro.eventType | titlecase }}</strong>
          a las {{ ultimoRegistro.recordedTime }} —
          <span [ngClass]="'badge-' + ultimoRegistro.status">{{ ultimoRegistro.status }}</span>
        </span>
      </div>
    </mat-card>

    <!-- Resumen estadístico del empleado -->
    <div class="stats-grid">
      <mat-card class="stat-card">
        <mat-icon class="stat-icon green">check_circle</mat-icon>
        <div class="stat-num">{{ registrosMes }}</div>
        <div class="stat-label">Asistencias este mes</div>
      </mat-card>
      <mat-card class="stat-card">
        <mat-icon class="stat-icon orange">schedule</mat-icon>
        <div class="stat-num">{{ tardanzasMes }}</div>
        <div class="stat-label">Tardanzas este mes</div>
      </mat-card>
      <mat-card class="stat-card">
        <mat-icon class="stat-icon blue">trending_up</mat-icon>
        <div class="stat-num">{{ puntualidad }}%</div>
        <div class="stat-label">Puntualidad</div>
      </mat-card>
      <mat-card class="stat-card">
        <mat-icon class="stat-icon purple">event_available</mat-icon>
        <div class="stat-num">{{ diasTrabajados }}</div>
        <div class="stat-label">Días trabajados</div>
      </mat-card>
    </div>

    <!-- Registros recientes -->
    <mat-card class="recientes-card">
      <div class="card-header-row">
        <h3>Registros recientes</h3>
        <button mat-button color="primary" (click)="irHistorial()">Ver todo</button>
      </div>
      <mat-divider></mat-divider>
      <div *ngFor="let r of registrosRecientes" class="registro-row">
        <mat-icon [class]="r.eventType === 'entrada' ? 'icon-entrada' : 'icon-salida'">
          {{ r.eventType === 'entrada' ? 'login' : 'logout' }}
        </mat-icon>
        <div class="reg-info">
          <strong>{{ r.eventType | titlecase }}</strong>
          <span class="reg-hora">{{ r.recordedTime }}</span>
        </div>
        <span class="badge" [ngClass]="'badge-' + r.status">{{ r.status }}</span>
        <span class="reg-dept">{{ r.departamento }}</span>
      </div>
      <div *ngIf="registrosRecientes.length === 0" class="empty-state">
        <mat-icon>event_note</mat-icon>
        <p>No hay registros aún</p>
      </div>
    </mat-card>

  </main>
</div>
  `,
  styles: [`
    .emp-layout { display:flex; min-height:100vh; background:#f1f5f9; font-family:'Segoe UI',sans-serif; }

    .sidebar { width:250px; background:#0f172a; color:#f1f5f9; display:flex; flex-direction:column; padding:1.5rem 1rem; gap:.5rem; }
    .sidebar-brand { display:flex; align-items:center; gap:.5rem; color:#6ee7b7; font-weight:700; font-size:1rem; padding:.5rem .75rem 1.5rem; }
    .sidebar-nav { flex:1; display:flex; flex-direction:column; gap:.25rem; }
    .nav-item { width:100%; justify-content:flex-start !important; color:#94a3b8 !important; border-radius:.75rem; padding:.5rem .75rem; gap:.75rem; }
    .nav-item:hover, .nav-item.active { background:rgba(110,231,183,.1) !important; color:#6ee7b7 !important; }
    .logout { color:#f87171 !important; margin-top:auto; }

    .main-content { flex:1; padding:2rem; display:flex; flex-direction:column; gap:1.5rem; max-width:900px; }

    .page-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; }
    .page-header h1 { margin:0; font-size:1.6rem; color:#0f172a; }
    .accent { color:#2e7d32; }
    .fecha-txt { margin:.25rem 0 0; color:#64748b; font-size:.9rem; }

    .turno-card { border-radius:1rem !important; padding:1.5rem; }
    .turno-dentro { border-left:5px solid #4caf50; }
    .turno-fuera  { border-left:5px solid #f59e0b; }
    .turno-libre  { border-left:5px solid #94a3b8; }
    .turno-info { display:flex; align-items:center; gap:1rem; }
    .turno-icon { font-size:2.5rem; }
    .turno-titulo { margin:0; font-size:1.2rem; }
    .turno-sub { margin:.25rem 0 0; color:#64748b; font-size:.88rem; }
    .ultimo-reg { display:flex; align-items:center; gap:.5rem; margin-top:1rem; font-size:.88rem; color:#475569; border-top:1px solid #e2e8f0; padding-top:.75rem; }

    .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; }
    .stat-card { border-radius:1rem !important; padding:1.5rem; text-align:center; }
    .stat-icon { font-size:2rem; margin-bottom:.5rem; }
    .stat-icon.green  { color:#22c55e; }
    .stat-icon.orange { color:#f59e0b; }
    .stat-icon.blue   { color:#3b82f6; }
    .stat-icon.purple { color:#8b5cf6; }
    .stat-num { font-size:2rem; font-weight:700; color:#0f172a; }
    .stat-label { font-size:.85rem; color:#64748b; }

    .recientes-card { border-radius:1rem !important; padding:1.5rem; }
    .card-header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .card-header-row h3 { margin:0; }
    .registro-row { display:flex; align-items:center; gap:1rem; padding:.75rem 0; border-bottom:1px solid #f1f5f9; }
    .icon-entrada { color:#22c55e; }
    .icon-salida  { color:#f59e0b; }
    .reg-info { flex:1; }
    .reg-info strong { display:block; }
    .reg-hora { font-size:.85rem; color:#64748b; }
    .reg-dept { font-size:.8rem; color:#94a3b8; }

    .badge { font-size:.75rem; padding:.2rem .6rem; border-radius:999px; font-weight:600; }
    .badge-puntual  { background:#dcfce7; color:#15803d; }
    .badge-tardanza { background:#fef3c7; color:#b45309; }
    .badge-ausente  { background:#fee2e2; color:#b91c1c; }

    .empty-state { text-align:center; padding:2rem; color:#94a3b8; }
    .empty-state mat-icon { font-size:3rem; }

    @media (max-width:768px) {
      .emp-layout { flex-direction:column; }
      .sidebar { width:100%; flex-direction:row; padding:1rem; }
      .sidebar-brand { display:none; }
      .sidebar-nav { flex-direction:row; }
    }
  `]
})
export class EmployeeDashboardComponent implements OnInit {

  nombreUsuario = 'Usuario';
  fechaHoy = '';
  estadoTurno: 'dentro' | 'fuera' | 'libre' = 'libre';
  iconoTurno = 'event_available';
  tituloTurno = 'Sin turno activo';
  subtituloTurno = 'No hay turno programado en este momento';

  ultimoRegistro: AttendanceRecord | null = null;
  registrosRecientes: AttendanceRecord[] = [];

  registrosMes = 0;
  tardanzasMes = 0;
  puntualidad  = 0;
  diasTrabajados = 0;

  constructor(
    private auth: AuthService,
    private attendance: AttendanceService,
    private router: Router
  ) {}

  ngOnInit() {
    const usuario = this.auth.usuarioActual;
    if (!usuario) { this.router.navigate(['/login']); return; }

    this.nombreUsuario = usuario.nombre;
    this.fechaHoy = new Date().toLocaleDateString('es-HN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    this.calcularEstadoTurno();
    this.cargarRegistros(usuario.uid);
  }

  private calcularEstadoTurno() {
    const hora = new Date().getHours();
    if (hora >= 8 && hora < 17) {
      this.estadoTurno = 'dentro';
      this.iconoTurno = 'work';
      this.tituloTurno = 'Dentro de horario laboral';
      this.subtituloTurno = 'Tu turno es de 08:00 a 17:00';
    } else {
      this.estadoTurno = 'fuera';
      this.iconoTurno = 'home';
      this.tituloTurno = 'Fuera de horario laboral';
      this.subtituloTurno = 'El turno no está activo en este momento';
    }
  }

  private cargarRegistros(uid: string) {
    this.attendance.getByUser(uid).subscribe(registros => {
      this.registrosRecientes = registros.slice(0, 5);
      this.ultimoRegistro = registros[0] ?? null;
      this.registrosMes = registros.length;
      this.tardanzasMes = registros.filter(r => r.status === 'tardanza').length;
      this.diasTrabajados = new Set(registros.map(r => r.recordedTime.split(' ')[0])).size || registros.length;
      this.puntualidad = this.registrosMes > 0
        ? Math.round(((this.registrosMes - this.tardanzasMes) / this.registrosMes) * 100)
        : 100;
    });
  }

  irCheckIn()  { this.router.navigate(['/employee/check-in']); }
  irHistorial(){ this.router.navigate(['/employee/history']); }
  cerrarSesion(){ this.auth.logout(); }
}
