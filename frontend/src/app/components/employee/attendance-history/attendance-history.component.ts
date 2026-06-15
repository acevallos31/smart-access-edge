import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../services/auth.service';
import { AttendanceService } from '../../../services/attendance.service';
import { AttendanceRecord } from '../../../models/models';

@Component({
  selector: 'app-attendance-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatSelectModule, MatInputModule
  ],
  template: `
<div class="emp-layout">
  <aside class="sidebar">
    <div class="sidebar-brand"><mat-icon>fingerprint</mat-icon><span>Smart Access Edge</span></div>
    <nav class="sidebar-nav">
      <button mat-button class="nav-item" (click)="router.navigate(['/employee/dashboard'])"><mat-icon>dashboard</mat-icon> Dashboard</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/employee/check-in'])"><mat-icon>how_to_reg</mat-icon> Registrar</button>
      <button mat-button class="nav-item active"><mat-icon>history</mat-icon> Mi Historial</button>
    </nav>
    <button mat-button class="nav-item logout" (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
  </aside>

  <main class="main-content">
    <div class="page-header">
      <h1>Mi Historial de Asistencia</h1>
    </div>

    <!-- Filtro -->
    <mat-card class="filter-card">
      <mat-form-field appearance="outline">
        <mat-label>Filtrar por estado</mat-label>
        <mat-select [(ngModel)]="filtroEstado" (ngModelChange)="aplicarFiltro()">
          <mat-option value="">Todos</mat-option>
          <mat-option value="puntual">Puntual</mat-option>
          <mat-option value="tardanza">Tardanza</mat-option>
          <mat-option value="ausente">Ausente</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Filtrar por tipo</mat-label>
        <mat-select [(ngModel)]="filtroTipo" (ngModelChange)="aplicarFiltro()">
          <mat-option value="">Todos</mat-option>
          <mat-option value="entrada">Entrada</mat-option>
          <mat-option value="salida">Salida</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-card>

    <!-- Tabla -->
    <mat-card class="table-card">
      <table mat-table [dataSource]="registrosFiltrados" class="full-table">

        <ng-container matColumnDef="tipo">
          <th mat-header-cell *matHeaderCellDef>Tipo</th>
          <td mat-cell *matCellDef="let r">
            <mat-icon [class]="r.eventType === 'entrada' ? 'icon-e' : 'icon-s'">
              {{ r.eventType === 'entrada' ? 'login' : 'logout' }}
            </mat-icon>
            {{ r.eventType | titlecase }}
          </td>
        </ng-container>

        <ng-container matColumnDef="hora_programada">
          <th mat-header-cell *matHeaderCellDef>Hora programada</th>
          <td mat-cell *matCellDef="let r">{{ r.scheduledTime }}</td>
        </ng-container>

        <ng-container matColumnDef="hora_registrada">
          <th mat-header-cell *matHeaderCellDef>Hora registrada</th>
          <td mat-cell *matCellDef="let r">{{ r.recordedTime }}</td>
        </ng-container>

        <ng-container matColumnDef="departamento">
          <th mat-header-cell *matHeaderCellDef>Departamento</th>
          <td mat-cell *matCellDef="let r">{{ r.departamento }}</td>
        </ng-container>

        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let r">
            <span class="badge" [ngClass]="'badge-' + r.status">{{ r.status }}</span>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let row; columns: columnas;"></tr>
      </table>

      <div *ngIf="registrosFiltrados.length === 0" class="empty-state">
        <mat-icon>event_note</mat-icon>
        <p>No hay registros con ese filtro</p>
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
    .main-content { flex:1; padding:2rem; display:flex; flex-direction:column; gap:1.5rem; }
    .page-header h1 { margin:0; font-size:1.6rem; color:#0f172a; }
    .filter-card { padding:1.5rem; border-radius:1rem !important; display:flex; gap:1rem; flex-wrap:wrap; }
    .table-card { border-radius:1rem !important; overflow:hidden; }
    .full-table { width:100%; }
    .icon-e { color:#22c55e; vertical-align:middle; margin-right:.25rem; }
    .icon-s { color:#f59e0b; vertical-align:middle; margin-right:.25rem; }
    .badge { font-size:.75rem; padding:.2rem .6rem; border-radius:999px; font-weight:600; }
    .badge-puntual  { background:#dcfce7; color:#15803d; }
    .badge-tardanza { background:#fef3c7; color:#b45309; }
    .badge-ausente  { background:#fee2e2; color:#b91c1c; }
    .empty-state { text-align:center; padding:3rem; color:#94a3b8; }
    .empty-state mat-icon { font-size:3rem; display:block; margin:0 auto .5rem; }
    th.mat-header-cell { background:#f8fafc; font-weight:600; color:#475569; }
  `]
})
export class AttendanceHistoryComponent implements OnInit {
  columnas = ['tipo', 'hora_programada', 'hora_registrada', 'departamento', 'estado'];
  registros: AttendanceRecord[] = [];
  registrosFiltrados: AttendanceRecord[] = [];
  filtroEstado = '';
  filtroTipo   = '';

  constructor(
    public auth: AuthService,
    private attendance: AttendanceService,
    public router: Router
  ) {}

  ngOnInit() {
    const uid = this.auth.usuarioActual?.uid ?? '';
    this.attendance.getByUser(uid).subscribe(r => {
      this.registros = r;
      this.aplicarFiltro();
    });
  }

  aplicarFiltro() {
    this.registrosFiltrados = this.registros.filter(r => {
      const matchEstado = !this.filtroEstado || r.status === this.filtroEstado;
      const matchTipo   = !this.filtroTipo   || r.eventType === this.filtroTipo;
      return matchEstado && matchTipo;
    });
  }
}
