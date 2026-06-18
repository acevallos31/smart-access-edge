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
import { CatalogService, CatalogItem } from '../../../services/catalog.service';

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
      <button mat-button class="nav-item active"><mat-icon>badge</mat-icon> Cargos y Departamentos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/turnos'])"><mat-icon>schedule</mat-icon> Turnos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/attendance'])"><mat-icon>fact_check</mat-icon> Registros</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/reports'])"><mat-icon>bar_chart</mat-icon> Reportes</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/settings'])"><mat-icon>settings</mat-icon> Configuración</button>
    </nav>
    <button mat-button class="nav-item logout" (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
  </aside>

  <main class="main-content">
    <div class="page-header">
      <h1>Catálogos de <span class="accent">Cargos y Departamentos</span></h1>
      <button mat-stroked-button (click)="cargar()"><mat-icon>refresh</mat-icon> Actualizar</button>
    </div>

    <div class="catalog-grid">
      <mat-card class="catalog-card">
        <mat-card-header>
          <mat-card-title><mat-icon>work</mat-icon> Cargos</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="add-row">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Nuevo cargo</mat-label>
              <input matInput [(ngModel)]="nuevoCargo" placeholder="Ej: Supervisor">
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="agregarCargo()" [disabled]="!nuevoCargo.trim()">Agregar</button>
          </div>
          <div class="catalog-list">
            <div class="catalog-item" *ngFor="let r of cargos">
              <ng-container *ngIf="editingCargoId === r.id; else cargoView">
                <input class="inline-input" [(ngModel)]="editingCargoName" [ngModelOptions]="{standalone:true}">
                <div class="item-actions">
                  <button mat-icon-button color="primary" (click)="guardarCargoEdicion()"><mat-icon>save</mat-icon></button>
                  <button mat-icon-button (click)="cancelarEdicion()"><mat-icon>close</mat-icon></button>
                </div>
              </ng-container>
              <ng-template #cargoView>
                <span class="chip">{{ r.name }}</span>
                <div class="item-actions">
                  <button mat-icon-button (click)="editarCargo(r)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="eliminarCargo(r)"><mat-icon>delete</mat-icon></button>
                </div>
              </ng-template>
            </div>
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
          <div class="catalog-list">
            <div class="catalog-item" *ngFor="let d of departamentos">
              <ng-container *ngIf="editingDepartamentoId === d.id; else deptView">
                <input class="inline-input" [(ngModel)]="editingDepartamentoName" [ngModelOptions]="{standalone:true}">
                <div class="item-actions">
                  <button mat-icon-button color="primary" (click)="guardarDepartamentoEdicion()"><mat-icon>save</mat-icon></button>
                  <button mat-icon-button (click)="cancelarEdicion()"><mat-icon>close</mat-icon></button>
                </div>
              </ng-container>
              <ng-template #deptView>
                <span class="chip">{{ d.name }}</span>
                <div class="item-actions">
                  <button mat-icon-button (click)="editarDepartamento(d)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="eliminarDepartamento(d)"><mat-icon>delete</mat-icon></button>
                </div>
              </ng-template>
            </div>
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
    .catalog-list { display:flex; flex-direction:column; gap:.6rem; margin-top:1rem; }
    .catalog-item { display:flex; align-items:center; justify-content:space-between; gap:.75rem; }
    .chip { background:#e2e8f0; color:#334155; border-radius:999px; padding:.3rem .7rem; font-size:.82rem; }
    .inline-input { flex:1; border:1px solid #cbd5e1; border-radius:.6rem; padding:.45rem .7rem; }
    .item-actions { display:flex; gap:.25rem; flex-shrink:0; }

    @media (max-width: 920px) {
      .catalog-grid { grid-template-columns:1fr; }
    }
  `]
})
export class CatalogsComponent implements OnInit {
  cargos: CatalogItem[] = [];
  departamentos: CatalogItem[] = [];
  nuevoCargo = '';
  nuevoDepartamento = '';
  editingCargoId = '';
  editingCargoName = '';
  editingDepartamentoId = '';
  editingDepartamentoName = '';

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
    this.catalogs.getRoleItems().subscribe({
      next: r => this.cargos = r,
      error: (e) => this.snackBar.open(e?.message ?? 'No se pudieron cargar los cargos', 'Cerrar', { duration: 3500 })
    });
    this.catalogs.getDepartmentItems().subscribe({
      next: d => this.departamentos = d,
      error: (e) => this.snackBar.open(e?.message ?? 'No se pudieron cargar los departamentos', 'Cerrar', { duration: 3500 })
    });
  }

  agregarCargo(): void {
    const name = this.nuevoCargo.trim();
    if (!name) return;

    this.catalogs.addRole(name).subscribe({
      next: () => {
        this.nuevoCargo = '';
        this.cargar();
        this.snackBar.open('Cargo creado', 'Cerrar', { duration: 2500 });
      },
      error: (e) => this.snackBar.open(e?.message ?? 'Error creando cargo', 'Cerrar', { duration: 3500 })
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
      },
      error: (e) => this.snackBar.open(e?.message ?? 'Error creando departamento', 'Cerrar', { duration: 3500 })
    });
  }

  editarCargo(item: CatalogItem): void {
    this.cancelarEdicion();
    this.editingCargoId = item.id;
    this.editingCargoName = item.name;
  }

  guardarCargoEdicion(): void {
    if (!this.editingCargoId || !this.editingCargoName.trim()) return;
    this.catalogs.updateRole(this.editingCargoId, this.editingCargoName.trim()).subscribe({
      next: () => {
        this.cancelarEdicion();
        this.cargar();
        this.snackBar.open('Cargo actualizado', 'Cerrar', { duration: 2500 });
      },
      error: (e) => this.snackBar.open(e?.message ?? 'Error actualizando cargo', 'Cerrar', { duration: 3500 })
    });
  }

  eliminarCargo(item: CatalogItem): void {
    if (!confirm(`Eliminar cargo ${item.name}?`)) return;
    this.catalogs.deleteRole(item.id).subscribe({
      next: () => { this.cargar(); this.snackBar.open('Cargo eliminado', 'Cerrar', { duration: 2500 }); },
      error: (e) => this.snackBar.open(e?.message ?? 'Error eliminando cargo', 'Cerrar', { duration: 3500 })
    });
  }

  editarDepartamento(item: CatalogItem): void {
    this.cancelarEdicion();
    this.editingDepartamentoId = item.id;
    this.editingDepartamentoName = item.name;
  }

  guardarDepartamentoEdicion(): void {
    if (!this.editingDepartamentoId || !this.editingDepartamentoName.trim()) return;
    this.catalogs.updateDepartment(this.editingDepartamentoId, this.editingDepartamentoName.trim()).subscribe({
      next: () => {
        this.cancelarEdicion();
        this.cargar();
        this.snackBar.open('Departamento actualizado', 'Cerrar', { duration: 2500 });
      },
      error: (e) => this.snackBar.open(e?.message ?? 'Error actualizando departamento', 'Cerrar', { duration: 3500 })
    });
  }

  eliminarDepartamento(item: CatalogItem): void {
    if (!confirm(`Eliminar departamento ${item.name}?`)) return;
    this.catalogs.deleteDepartment(item.id).subscribe({
      next: () => { this.cargar(); this.snackBar.open('Departamento eliminado', 'Cerrar', { duration: 2500 }); },
      error: (e) => this.snackBar.open(e?.message ?? 'Error eliminando departamento', 'Cerrar', { duration: 3500 })
    });
  }

  cancelarEdicion(): void {
    this.editingCargoId = '';
    this.editingCargoName = '';
    this.editingDepartamentoId = '';
    this.editingDepartamentoName = '';
  }
}
