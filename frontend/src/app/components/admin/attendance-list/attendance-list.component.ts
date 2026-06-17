import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth.service';
import { ReportService } from '../../../services/report.service';
import { EmployeeService } from '../../../services/employee.service';
import { TurnoService, Turno } from '../../../services/turno.service';
import { CatalogService } from '../../../services/catalog.service';
import { AttendanceRecord, Employee } from '../../../models/models';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTooltipModule
  ],
  template: `
<div class="admin-layout">
  <aside class="sidebar">
    <div class="sidebar-brand"><mat-icon>fingerprint</mat-icon><span>Smart Access Edge</span></div>
    <div class="sidebar-role">Administrador</div>
    <nav class="sidebar-nav">
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/dashboard'])"><mat-icon>dashboard</mat-icon> Dashboard</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/employees'])"><mat-icon>group</mat-icon> Empleados</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/users'])"><mat-icon>manage_accounts</mat-icon> Usuarios</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/catalogs'])"><mat-icon>badge</mat-icon> Cargos y Departamentos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/turnos'])"><mat-icon>schedule</mat-icon> Turnos</button>
      <button mat-button class="nav-item active"><mat-icon>fact_check</mat-icon> Registros</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/reports'])"><mat-icon>bar_chart</mat-icon> Reportes</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/settings'])"><mat-icon>settings</mat-icon> Configuración</button>
    </nav>
    <button mat-button class="nav-item logout" (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
  </aside>

  <main class="main-content">
    <div class="page-header">
      <h1>Registros de <span class="accent">Asistencia</span></h1>
      <div class="header-actions">
        <button mat-stroked-button (click)="cargar()"><mat-icon>refresh</mat-icon> Actualizar</button>
        <button mat-raised-button color="primary" (click)="exportarCSV()">
          <mat-icon>download</mat-icon> Exportar CSV
        </button>
      </div>
    </div>

    <!-- Estadísticas rápidas -->
    <div class="quick-stats">
      <div class="qstat"><span class="qnum">{{ total }}</span><span class="qlabel">Total</span></div>
      <div class="qstat green"><span class="qnum">{{ puntuales }}</span><span class="qlabel">Puntuales</span></div>
      <div class="qstat orange"><span class="qnum">{{ tardanzas }}</span><span class="qlabel">Tardanzas</span></div>
      <div class="qstat red"><span class="qnum">{{ ausentes }}</span><span class="qlabel">Ausentes</span></div>
    </div>

    <!-- Filtros -->
    <mat-card class="filter-card">
      <mat-form-field appearance="outline">
        <mat-label>Periodo</mat-label>
        <mat-select [(ngModel)]="periodo" (ngModelChange)="onPeriodoChange()">
          <mat-option value="semana">Semana</mat-option>
          <mat-option value="mes">Mes</mat-option>
          <mat-option value="custom">Rango personalizado</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Desde</mat-label>
        <input matInput type="date" [(ngModel)]="desde" (change)="cargar()" [disabled]="periodo !== 'custom'">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Hasta</mat-label>
        <input matInput type="date" [(ngModel)]="hasta" (change)="cargar()" [disabled]="periodo !== 'custom'">
      </mat-form-field>
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Buscar</mat-label>
        <input matInput [(ngModel)]="busqueda" (ngModelChange)="filtrar()" placeholder="Nombre, departamento, turno...">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Empleado</mat-label>
        <mat-select [(ngModel)]="filtroEmpleado" (ngModelChange)="filtrar()">
          <mat-option value="">Todos</mat-option>
          <mat-option *ngFor="let e of empleados" [value]="e.id">{{ e.nombre }}</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Turno</mat-label>
        <mat-select [(ngModel)]="filtroTurno" (ngModelChange)="filtrar()">
          <mat-option value="">Todos</mat-option>
          <mat-option *ngFor="let t of turnos" [value]="t.id">{{ t.nombre }}</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Departamento</mat-label>
        <mat-select [(ngModel)]="filtroDepartamento" (ngModelChange)="filtrar()">
          <mat-option value="">Todos</mat-option>
          <mat-option *ngFor="let d of departamentos" [value]="d">{{ d }}</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Estado</mat-label>
        <mat-select [(ngModel)]="filtroEstado" (ngModelChange)="filtrar()">
          <mat-option value="">Todos</mat-option>
          <mat-option value="puntual">Puntual</mat-option>
          <mat-option value="tardanza">Tardanza</mat-option>
          <mat-option value="ausente">Ausente</mat-option>
          <mat-option value="extra">Extra</mat-option>
          <mat-option value="fuera de horario">Fuera de horario</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Tipo</mat-label>
        <mat-select [(ngModel)]="filtroTipo" (ngModelChange)="filtrar()">
          <mat-option value="">Todos</mat-option>
          <mat-option value="entrada">Entrada</mat-option>
          <mat-option value="salida">Salida</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-card>

    <!-- Tabla de registros -->
    <mat-card class="table-card">
      <table mat-table [dataSource]="registrosFiltrados" class="full-table">

        <ng-container matColumnDef="empleado">
          <th mat-header-cell *matHeaderCellDef>Empleado</th>
          <td mat-cell *matCellDef="let r">
            <div class="emp-cell">
              <div class="emp-avatar">{{ r.userName.charAt(0) }}</div>
              <div>
                <strong>{{ r.userName }}</strong>
                <div class="emp-dept">{{ r.departamento }}</div>
                <div class="emp-turno">{{ r.turnoNombre || 'Sin turno' }}</div>
              </div>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="tipo">
          <th mat-header-cell *matHeaderCellDef>Tipo</th>
          <td mat-cell *matCellDef="let r">
            <span class="tipo-badge" [ngClass]="'tipo-' + r.eventType">
              <mat-icon>{{ r.eventType === 'entrada' ? 'login' : 'logout' }}</mat-icon>
              {{ r.eventType | titlecase }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="programada">
          <th mat-header-cell *matHeaderCellDef>Hora Prog.</th>
          <td mat-cell *matCellDef="let r">{{ r.scheduledTime }}</td>
        </ng-container>

        <ng-container matColumnDef="registrada">
          <th mat-header-cell *matHeaderCellDef>Hora Reg.</th>
          <td mat-cell *matCellDef="let r"><strong>{{ r.recordedTime }}</strong></td>
        </ng-container>

        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let r">
            <span class="badge" [ngClass]="estadoClass(r.status)">{{ r.status }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="lugar">
          <th mat-header-cell *matHeaderCellDef>Lugar</th>
          <td mat-cell *matCellDef="let r">{{ r.lugarRegistro || '--' }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let row; columns: columnas;"></tr>
      </table>

      <div *ngIf="registrosFiltrados.length === 0" class="empty-state">
        <mat-icon>event_busy</mat-icon>
        <p>No hay registros que coincidan con el filtro</p>
      </div>
    </mat-card>
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
    .header-actions { display:flex; gap:.75rem; flex-wrap:wrap; }
    .quick-stats { display:flex; gap:1rem; flex-wrap:wrap; }
    .qstat { background:#fff; border-radius:1rem; padding:1rem 1.5rem; display:flex; flex-direction:column; align-items:center; box-shadow:0 1px 3px rgba(0,0,0,.08); min-width:100px; }
    .qstat.green .qnum { color:#22c55e; }
    .qstat.orange .qnum { color:#f59e0b; }
    .qstat.red .qnum    { color:#ef4444; }
    .qnum { font-size:1.8rem; font-weight:800; color:#0f172a; }
    .qlabel { font-size:.78rem; color:#64748b; }
    .filter-card { border-radius:1rem !important; padding:1.5rem; display:flex; gap:1rem; flex-wrap:wrap; align-items:center; }
    .search-field { flex:1; min-width:200px; }
    .filter-card mat-form-field { min-width:170px; }
    .table-card { border-radius:1rem !important; overflow:hidden; }
    .full-table { width:100%; }
    .emp-cell { display:flex; align-items:center; gap:.75rem; }
    .emp-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#2e7d32,#4caf50); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0; }
    .emp-dept { font-size:.8rem; color:#64748b; }
    .emp-turno { font-size:.75rem; color:#334155; font-weight:600; }
    .tipo-badge { display:inline-flex; align-items:center; gap:.25rem; font-size:.82rem; }
    .tipo-entrada mat-icon { color:#22c55e; font-size:1.1rem; }
    .tipo-salida  mat-icon { color:#f59e0b; font-size:1.1rem; }
    .badge { font-size:.75rem; padding:.25rem .7rem; border-radius:999px; font-weight:600; }
    .badge-puntual  { background:#dcfce7; color:#15803d; }
    .badge-tardanza { background:#fef3c7; color:#b45309; }
    .badge-ausente  { background:#fee2e2; color:#b91c1c; }
    .badge-extra { background:#dbeafe; color:#1d4ed8; }
    .badge-fuera-horario { background:#ffedd5; color:#c2410c; }
    .empty-state { text-align:center; padding:3rem; color:#94a3b8; }
    .empty-state mat-icon { font-size:3rem; display:block; margin:0 auto .5rem; }
    th.mat-header-cell { background:#f8fafc; font-weight:600; color:#475569; }
  `]
})
export class AttendanceListComponent implements OnInit {
  columnas = ['empleado', 'tipo', 'programada', 'registrada', 'estado', 'lugar'];
  registros: AttendanceRecord[] = [];
  registrosFiltrados: AttendanceRecord[] = [];
  empleados: Employee[] = [];
  turnos: Turno[] = [];
  departamentos: string[] = [];
  periodo: 'semana' | 'mes' | 'custom' = 'custom';
  desde = '';
  hasta = '';
  busqueda = '';
  filtroEmpleado = '';
  filtroTurno = '';
  filtroDepartamento = '';
  filtroEstado = '';
  filtroTipo   = '';

  get total()    { return this.registros.length; }
  get puntuales(){ return this.registros.filter(r => r.status === 'puntual').length; }
  get tardanzas(){ return this.registros.filter(r => r.status === 'tardanza').length; }
  get ausentes() { return this.registros.filter(r => r.status === 'ausente').length; }

  constructor(
    public auth: AuthService,
    private reports: ReportService,
    private employeesService: EmployeeService,
    private turnosService: TurnoService,
    private catalogs: CatalogService,
    public router: Router
  ) {}

  ngOnInit() {
    const hoy = new Date();
    const hace7 = new Date();
    hace7.setDate(hace7.getDate() - 6);
    this.desde = hace7.toISOString().slice(0, 10);
    this.hasta = hoy.toISOString().slice(0, 10);
    this.cargarOpciones();
    this.cargar();
  }

  cargarOpciones() {
    this.employeesService.getAll(true).subscribe(items => this.empleados = items);
    this.turnosService.getAll(true).subscribe(items => this.turnos = items);
    this.catalogs.getDepartments().subscribe(items => this.departamentos = items);
  }

  cargar() {
    const periodo = this.periodo === 'custom' ? 'custom' : this.periodo;
    const desde = this.periodo === 'custom' ? this.desde : undefined;
    const hasta = this.periodo === 'custom' ? this.hasta : undefined;

    this.reports.getRecords(periodo, desde, hasta).subscribe(r => {
      this.registros = r;
      this.filtrar();
    });
  }

  onPeriodoChange() {
    if (this.periodo !== 'custom') {
      this.cargar();
      return;
    }
    if (this.desde && this.hasta) {
      this.cargar();
    }
  }

  filtrar() {
    this.registrosFiltrados = this.registros.filter(r => {
      const matchBusq = !this.busqueda ||
        r.userName.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        r.departamento.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        (r.turnoNombre ?? '').toLowerCase().includes(this.busqueda.toLowerCase());
      const matchEmpleado = !this.filtroEmpleado || r.userId === this.filtroEmpleado || r.employeeId === this.filtroEmpleado;
      const matchTurno = !this.filtroTurno || r.turnoId === this.filtroTurno || r.turnoNombre === this.turnos.find(t => t.id === this.filtroTurno)?.nombre;
      const matchDepartamento = !this.filtroDepartamento || r.departamento === this.filtroDepartamento;
      const matchEstado = !this.filtroEstado || r.status === this.filtroEstado;
      const matchTipo   = !this.filtroTipo   || r.eventType === this.filtroTipo;
      return matchBusq && matchEmpleado && matchTurno && matchDepartamento && matchEstado && matchTipo;
    });
  }

  exportarCSV() {
    const cabecera = ['Empleado', 'Departamento', 'Turno', 'Tipo', 'H.Programada', 'H.Registrada', 'Estado', 'Lugar', 'Ciudad', 'Pais', 'Fecha'].join(',');
    const filas = this.registrosFiltrados.map(r =>
      [
        r.userName,
        r.departamento,
        r.turnoNombre ?? '',
        r.eventType,
        r.scheduledTime,
        r.recordedTime,
        r.status,
        r.lugarRegistro ?? '',
        r.ciudadRegistro ?? '',
        r.paisRegistro ?? '',
        r.timestamp ?? ''
      ].join(',')
    );
    const csv = [cabecera, ...filas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  estadoClass(status: string): string {
    const value = (status ?? '').toLowerCase();
    if (value === 'puntual') return 'badge-puntual';
    if (value === 'tardanza') return 'badge-tardanza';
    if (value === 'extra') return 'badge-extra';
    if (value === 'fuera de horario') return 'badge-fuera-horario';
    return 'badge-ausente';
  }
}
