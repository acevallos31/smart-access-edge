import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../services/auth.service';
import { CatalogService } from '../../../services/catalog.service';

@Component({
  selector: 'app-catalogs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule
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
      <button mat-button class="nav-item active"><mat-icon>badge</mat-icon> Roles y Deptos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/turnos'])"><mat-icon>schedule</mat-icon> Turnos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/attendance'])"><mat-icon>fact_check</mat-icon> Registros</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/reports'])"><mat-icon>bar_chart</mat-icon> Reportes</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/settings'])"><mat-icon>settings</mat-icon> Configuración</button>
    </nav>
    <button mat-button class="nav-item logout" (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
  </aside>

  <main class="main-content">
    <div class="page-header">
      <h1>Catálogos de <span class="accent">Roles y Departamentos</span></h1>
      <button mat-stroked-button (click)="cargar()"><mat-icon>refresh</mat-icon> Actualizar</button>
    </div>

    <div class="catalog-grid">
      <mat-card class="catalog-card">
        <mat-card-header>
          <mat-card-title><mat-icon>badge</mat-icon> Roles</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="add-row">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Nuevo rol</mat-label>
              <input matInput [(ngModel)]="nuevoRol" placeholder="Ej: Supervisor">
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="agregarRol()" [disabled]="!nuevoRol.trim()">Agregar</button>
          </div>
          <div class="chips">
            <span class="chip" *ngFor="let r of roles">{{ r }}</span>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="catalog-card">
        <mat-card-header>
          <mat-card-title><mat-icon>apartment</mat-icon> Departamentos</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="add-row">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Nuevo departamento</mat-label>
              <input matInput [(ngModel)]="nuevoDepartamento" placeholder="Ej: Soporte">
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="agregarDepartamento()" [disabled]="!nuevoDepartamento.trim()">Agregar</button>
          </div>
          <div class="chips">
            <span class="chip" *ngFor="let d of departamentos">{{ d }}</span>
          </div>
        </mat-card-content>
      </mat-card>
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
    .page-header { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; }
    .page-header h1 { margin:0; font-size:1.7rem; color:#0f172a; }
    .accent { color:#2e7d32; }

    .catalog-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .catalog-card { border-radius:1rem !important; }
    .add-row { display:flex; gap:.75rem; align-items:center; }
    .full { flex:1; }
    .chips { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1rem; }
    .chip { background:#e2e8f0; color:#334155; border-radius:999px; padding:.3rem .7rem; font-size:.82rem; }

    @media (max-width: 920px) {
      .catalog-grid { grid-template-columns:1fr; }
    }
  `]
})
export class CatalogsComponent implements OnInit {
  roles: string[] = [];
  departamentos: string[] = [];
  nuevoRol = '';
  nuevoDepartamento = '';

  constructor(
    public auth: AuthService,
    public router: Router,
    private catalogs: CatalogService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.catalogs.getRoles().subscribe({ next: r => this.roles = r });
    this.catalogs.getDepartments().subscribe({ next: d => this.departamentos = d });
  }

  agregarRol(): void {
    const name = this.nuevoRol.trim();
    if (!name) return;

    this.catalogs.addRole(name).subscribe({
      next: () => {
        this.nuevoRol = '';
        this.cargar();
        this.snackBar.open('Rol creado', 'Cerrar', { duration: 2500 });
      }
    });
  }

  agregarDepartamento(): void {
    const name = this.nuevoDepartamento.trim();
    if (!name) return;

    this.catalogs.addDepartment(name).subscribe({
      next: () => {
        this.nuevoDepartamento = '';
        this.cargar();
        this.snackBar.open('Departamento creado', 'Cerrar', { duration: 2500 });
      }
    });
  }
}
