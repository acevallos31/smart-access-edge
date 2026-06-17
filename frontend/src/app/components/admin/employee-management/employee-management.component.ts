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
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth.service';
import { EmployeeService } from '../../../services/employee.service';
import { Employee } from '../../../models/models';

@Component({
  selector: 'app-employee-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatInputModule,
    MatChipsModule, MatTooltipModule
  ],
  template: `
<div class="admin-layout">
  <aside class="sidebar">
    <div class="sidebar-brand"><mat-icon>fingerprint</mat-icon><span>Smart Access Edge</span></div>
    <div class="sidebar-role">{{ auth.usuarioActual?.rol }}</div>
    <nav class="sidebar-nav">
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/dashboard'])"><mat-icon>dashboard</mat-icon> Dashboard</button>
      <button mat-button class="nav-item active"><mat-icon>group</mat-icon> Empleados</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/users'])"><mat-icon>manage_accounts</mat-icon> Usuarios</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/catalogs'])"><mat-icon>badge</mat-icon> Roles y Deptos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/turnos'])"><mat-icon>schedule</mat-icon> Turnos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/attendance'])"><mat-icon>fact_check</mat-icon> Registros</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/reports'])"><mat-icon>bar_chart</mat-icon> Reportes</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/settings'])"><mat-icon>settings</mat-icon> Configuración</button>
    </nav>
    <button mat-button class="nav-item logout" (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
  </aside>

  <main class="main-content">
    <div class="page-header">
      <h1>Gestión de <span class="accent">Empleados</span></h1>
      <button mat-raised-button color="primary" (click)="nuevoEmpleado()">
        <mat-icon>person_add</mat-icon> Nuevo Empleado
      </button>
    </div>

    <!-- Búsqueda y filtro -->
    <mat-card class="filter-card">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Buscar empleado</mat-label>
        <input matInput [(ngModel)]="busqueda" (ngModelChange)="filtrar()" placeholder="Nombre o departamento...">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <div class="filter-chips">
        <button mat-stroked-button [class.active-chip]="filtroActivo === ''" (click)="setFiltro('')">Todos</button>
        <button mat-stroked-button [class.active-chip]="filtroActivo === 'activo'" (click)="setFiltro('activo')">Activos</button>
        <button mat-stroked-button [class.active-chip]="filtroActivo === 'inactivo'" (click)="setFiltro('inactivo')">Inactivos</button>
      </div>
    </mat-card>

    <!-- Tabla de empleados -->
    <mat-card class="table-card">
      <table mat-table [dataSource]="empleadosFiltrados" class="full-table">

        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Empleado</th>
          <td mat-cell *matCellDef="let e">
            <div class="emp-cell">
              <div class="emp-avatar">{{ e.nombre.charAt(0) }}</div>
              <div>
                <strong>{{ e.nombre }}</strong>
                <div class="emp-cargo">{{ e.cargo }}</div>
              </div>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="departamento">
          <th mat-header-cell *matHeaderCellDef>Departamento</th>
          <td mat-cell *matCellDef="let e">{{ e.departamento }}</td>
        </ng-container>

        <ng-container matColumnDef="horario">
          <th mat-header-cell *matHeaderCellDef>Horario</th>
          <td mat-cell *matCellDef="let e">{{ e.horarioEntrada ?? e.horario?.entrada ?? '--' }} – {{ e.horarioSalida ?? e.horario?.salida ?? '--' }}</td>
        </ng-container>

        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let e">
            <span class="badge" [ngClass]="e.activo ? 'badge-activo' : 'badge-inactivo'">
              {{ e.activo ? 'Activo' : 'Inactivo' }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef>Acciones</th>
          <td mat-cell *matCellDef="let e">
            <button mat-icon-button color="primary" matTooltip="Editar" (click)="editar(e)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button [color]="e.activo ? 'warn' : 'primary'"
                    [matTooltip]="e.activo ? 'Desactivar' : 'Activar'"
                    (click)="toggleEstado(e)">
              <mat-icon>{{ e.activo ? 'person_off' : 'person' }}</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let row; columns: columnas;"></tr>
      </table>

      <div *ngIf="empleadosFiltrados.length === 0" class="empty-state">
        <mat-icon>group_off</mat-icon>
        <p>No se encontraron empleados</p>
      </div>
    </mat-card>
  </main>
</div>

<!-- Diálogo de confirmación para desactivar -->
<div class="dialogo-overlay" *ngIf="empleadoAConfirmar">
  <div class="dialogo-box">
    <mat-icon class="dialogo-icono" [color]="empleadoAConfirmar.activo ? 'warn' : 'primary'">
      {{ empleadoAConfirmar.activo ? 'person_off' : 'person' }}
    </mat-icon>
    <h3>{{ empleadoAConfirmar.activo ? 'Desactivar' : 'Activar' }} empleado</h3>
    <p>¿Estás seguro de que deseas <strong>{{ empleadoAConfirmar.activo ? 'desactivar' : 'activar' }}</strong> a <strong>{{ empleadoAConfirmar.nombre }}</strong>?</p>
    <p *ngIf="empleadoAConfirmar.activo" class="dialogo-aviso">El historial de asistencia se conservará.</p>
    <div class="dialogo-btns">
      <button mat-stroked-button (click)="empleadoAConfirmar = null">Cancelar</button>
      <button mat-raised-button [color]="empleadoAConfirmar.activo ? 'warn' : 'primary'" (click)="confirmarToggle()">
        {{ empleadoAConfirmar.activo ? 'Sí, desactivar' : 'Sí, activar' }}
      </button>
    </div>
  </div>
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
    .filter-card { border-radius:1rem !important; padding:1.5rem; display:flex; gap:1rem; align-items:center; flex-wrap:wrap; }
    .search-field { flex:1; min-width:200px; }
    .filter-chips { display:flex; gap:.5rem; }
    .active-chip { background:#dcfce7 !important; color:#15803d !important; border-color:#15803d !important; }
    .table-card { border-radius:1rem !important; overflow:hidden; }
    .full-table { width:100%; }
    .emp-cell { display:flex; align-items:center; gap:.75rem; }
    .emp-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#2e7d32,#4caf50); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1rem; flex-shrink:0; }
    .emp-cargo { font-size:.8rem; color:#64748b; }
    .badge { font-size:.75rem; padding:.25rem .7rem; border-radius:999px; font-weight:600; }
    .badge-activo   { background:#dcfce7; color:#15803d; }
    .badge-inactivo { background:#f1f5f9; color:#94a3b8; }
    .empty-state { text-align:center; padding:3rem; color:#94a3b8; }
    .empty-state mat-icon { font-size:3rem; display:block; margin:0 auto .5rem; }
    th.mat-header-cell { background:#f8fafc; font-weight:600; color:#475569; }

    .dialogo-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .dialogo-box { background:#fff; border-radius:1rem; padding:2rem; max-width:400px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,.3); }
    .dialogo-icono { font-size:3rem; width:3rem; height:3rem; margin-bottom:.5rem; }
    .dialogo-box h3 { margin:0 0 .75rem; }
    .dialogo-aviso { font-size:.85rem; color:#64748b; }
    .dialogo-btns { display:flex; gap:.75rem; justify-content:center; margin-top:1.5rem; }
  `]
})
export class EmployeeManagementComponent implements OnInit {
  columnas = ['nombre', 'departamento', 'horario', 'estado', 'acciones'];
  empleados: Employee[] = [];
  empleadosFiltrados: Employee[] = [];
  busqueda = '';
  filtroActivo = '';
  empleadoAConfirmar: Employee | null = null;

  constructor(
    public auth: AuthService,
    private empService: EmployeeService,
    public router: Router
  ) {}

  ngOnInit() {
    this.empService.getAll().subscribe(e => {
      this.empleados = e;
      this.filtrar();
    });
  }

  filtrar() {
    this.empleadosFiltrados = this.empleados.filter(e => {
      const matchBusq = !this.busqueda ||
        e.nombre.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        e.departamento.toLowerCase().includes(this.busqueda.toLowerCase());
      const matchEstado =
        !this.filtroActivo ||
        (this.filtroActivo === 'activo' && e.activo) ||
        (this.filtroActivo === 'inactivo' && !e.activo);
      return matchBusq && matchEstado;
    });
  }

  setFiltro(f: string) { this.filtroActivo = f; this.filtrar(); }

  nuevoEmpleado() { this.router.navigate(['/admin/employees/new']); }
  editar(e: Employee) { this.router.navigate(['/admin/employees/edit', e.id]); }
  toggleEstado(e: Employee) { this.empleadoAConfirmar = e; }

  confirmarToggle() {
    if (!this.empleadoAConfirmar) return;
    const emp = this.empleadoAConfirmar;
    const obs = emp.activo
      ? this.empService.deactivate(emp.id!)
      : this.empService.activate(emp.id!);
    obs.subscribe(() => {
      emp.activo = !emp.activo;
      this.empleadoAConfirmar = null;
      this.filtrar();
    });
  }
}
