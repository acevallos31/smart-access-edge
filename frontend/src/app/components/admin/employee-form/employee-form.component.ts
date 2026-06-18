import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { EmployeeService } from '../../../services/employee.service';
import { CatalogService } from '../../../services/catalog.service';
import { TurnoService, Turno } from '../../../services/turno.service';
import { Employee, normalizarRolSistema } from '../../../models/models';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule
  ],
  template: `
<div class="admin-layout">
  <aside class="sidebar">
    <div class="sidebar-brand"><mat-icon>fingerprint</mat-icon><span>Smart Access Edge</span></div>
    <div class="sidebar-role">Administrador</div>
    <nav class="sidebar-nav">
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/dashboard'])"><mat-icon>dashboard</mat-icon> Dashboard</button>
      <button mat-button class="nav-item active"><mat-icon>group</mat-icon> Empleados</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/users'])"><mat-icon>manage_accounts</mat-icon> Usuarios</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/catalogs'])"><mat-icon>badge</mat-icon> Cargos y Departamentos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/turnos'])"><mat-icon>schedule</mat-icon> Turnos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/attendance'])"><mat-icon>fact_check</mat-icon> Registros</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/reports'])"><mat-icon>bar_chart</mat-icon> Reportes</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/settings'])"><mat-icon>settings</mat-icon> Configuración</button>
    </nav>
    <button mat-button class="nav-item logout" (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
  </aside>

  <main class="main-content">
    <div class="page-header">
      <div>
        <button mat-icon-button (click)="volver()"><mat-icon>arrow_back</mat-icon></button>
        <h1>{{ esEdicion ? 'Editar' : 'Nuevo' }} <span class="accent">Empleado</span></h1>
      </div>
    </div>

    <mat-card class="form-card">
      <mat-card-content>
        <form (ngSubmit)="guardar()">

          <div class="form-grid">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Nombre completo *</mat-label>
              <input matInput [(ngModel)]="empleado.nombre" name="nombre" required>
              <mat-icon matSuffix>person</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Departamento *</mat-label>
              <mat-select [(ngModel)]="empleado.departamento" name="departamento" required>
                <mat-option *ngFor="let d of departamentos" [value]="d">{{ d }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Cargo *</mat-label>
              <input matInput [(ngModel)]="empleado.cargo" name="cargo" required>
              <mat-icon matSuffix>work</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Turno asignado</mat-label>
              <mat-select [(ngModel)]="empleado.turnoId" name="turnoId" (ngModelChange)="onTurnoChange($event)">
                <mat-option value="">Sin turno</mat-option>
                <mat-option *ngFor="let t of turnos" [value]="t.id">{{ t.nombre }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Cargo del sistema *</mat-label>
              <mat-select [(ngModel)]="empleado.rol" name="rol" required>
                <mat-option *ngFor="let r of roles" [value]="r">{{ r }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hora de entrada *</mat-label>
              <input matInput type="time" [(ngModel)]="empleado.horarioEntrada" name="entrada" required>
              <mat-icon matSuffix>schedule</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hora de salida *</mat-label>
              <input matInput type="time" [(ngModel)]="empleado.horarioSalida" name="salida" required>
              <mat-icon matSuffix>schedule</mat-icon>
            </mat-form-field>
          </div>

          <!-- Foto de referencia -->
          <div class="foto-section">
            <h3>Foto de referencia</h3>
            <p class="foto-desc">Esta foto se usará para el reconocimiento facial. Usa una foto frontal con buena iluminación.</p>

            <div class="foto-upload-area" (click)="fotoInput.click()" [class.has-foto]="fotoPreview">
              <img *ngIf="fotoPreview" [src]="fotoPreview" alt="Preview" class="foto-preview">
              <div *ngIf="!fotoPreview" class="foto-placeholder">
                <mat-icon>add_a_photo</mat-icon>
                <p>Click para seleccionar foto</p>
              </div>
            </div>
            <input #fotoInput type="file" accept="image/*" style="display:none"
                   (change)="onFotoSeleccionada($event)">

            <div *ngIf="fotoPreview" class="foto-actions">
              <button mat-stroked-button type="button" (click)="quitarFoto(fotoInput)">
                <mat-icon>delete</mat-icon> Quitar foto
              </button>
            </div>
          </div>

          <div *ngIf="errorMsg" class="error-msg">
            <mat-icon>error_outline</mat-icon> {{ errorMsg }}
          </div>

          <div class="form-actions">
            <button mat-stroked-button type="button" (click)="volver()" [disabled]="guardando">Cancelar</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="guardando">
              <mat-spinner *ngIf="guardando" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!guardando">save</mat-icon>
              {{ guardando ? 'Guardando...' : (esEdicion ? 'Actualizar' : 'Crear empleado') }}
            </button>
          </div>

        </form>
      </mat-card-content>
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
    .main-content { flex:1; padding:2rem; display:flex; flex-direction:column; gap:1.5rem; max-width:800px; }
    .page-header { display:flex; align-items:center; gap:.5rem; }
    .page-header h1 { margin:0; font-size:1.7rem; color:#0f172a; }
    .accent { color:#2e7d32; }
    .form-card { border-radius:1rem !important; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; }
    .full { grid-column:1/-1; }
    @media (max-width:600px) { .form-grid { grid-template-columns:1fr; } }

    .foto-section { border-top:1px solid #e2e8f0; padding-top:1.5rem; margin-bottom:1.5rem; }
    .foto-section h3 { margin:0 0 .25rem; }
    .foto-desc { font-size:.85rem; color:#64748b; margin:0 0 1rem; }
    .foto-upload-area { width:200px; height:200px; border:2px dashed #cbd5e1; border-radius:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; overflow:hidden; transition:border-color .2s; }
    .foto-upload-area:hover, .foto-upload-area.has-foto { border-color:#2e7d32; border-style:solid; }
    .foto-preview { width:100%; height:100%; object-fit:cover; }
    .foto-placeholder { text-align:center; color:#94a3b8; }
    .foto-placeholder mat-icon { font-size:3rem; }
    .foto-actions { margin-top:.75rem; }
    .error-msg { display:flex; align-items:center; gap:.5rem; background:#fce4ec; color:#c62828; border-radius:.5rem; padding:.75rem; margin-bottom:1rem; font-size:.9rem; }
    .form-actions { display:flex; justify-content:flex-end; gap:1rem; padding-top:1rem; border-top:1px solid #e2e8f0; }
  `]
})
export class EmployeeFormComponent implements OnInit {
  esEdicion = false;
  guardando = false;
  errorMsg = '';
  fotoPreview: string | null = null;
  fotoArchivo: File | null = null;
  fotoEliminada = false;

  empleado: Employee = {
    nombre: '',
    departamento: '',
    cargo: '',
    horarioEntrada: '08:00',
    horarioSalida: '17:00',
    activo: true
  };

  departamentos = [
    'Recursos Humanos', 'Tecnología', 'Contabilidad',
    'Ventas', 'Marketing', 'Operaciones', 'Legal', 'Gerencia'
  ];
  roles = ['Usuario', 'Administrador'];
  turnos: Turno[] = [];

  constructor(
    public auth: AuthService,
    private empService: EmployeeService,
    private catalogs: CatalogService,
    private turnosService: TurnoService,
    private route: ActivatedRoute,
    public router: Router
  ) {}

  ngOnInit() {
    this.catalogs.getDepartments().subscribe({
      next: (items) => {
        if (items.length) this.departamentos = items;
      }
    });

    this.turnosService.getAll(true).subscribe({
      next: (items) => {
        this.turnos = items;
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion = true;
      this.empService.getById(id).subscribe(e => {
        if (e) {
          this.empleado = { ...e };
          this.empleado.rol = normalizarRolSistema(this.empleado.rol ?? 'Usuario');
          if (e.fotoUrl) this.fotoPreview = e.fotoUrl;
        }
      });
    } else {
      this.empleado.rol = 'Usuario';
    }
  }

  onFotoSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.fotoArchivo = file;
    this.fotoEliminada = false;
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.fotoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  quitarFoto(fotoInput: HTMLInputElement) {
    this.fotoPreview = null;
    this.fotoArchivo = null;
    this.fotoEliminada = true;
    this.empleado.fotoUrl = '';
    fotoInput.value = '';
  }

  guardar() {
    this.errorMsg = '';
    if (!this.empleado.nombre || !this.empleado.departamento || !this.empleado.cargo || !this.empleado.rol) {
      this.errorMsg = 'Por favor completa todos los campos obligatorios.';
      return;
    }

    // Sincronizar objeto horario con los campos planos antes de guardar
    this.empleado.horario = {
      entrada: this.empleado.horarioEntrada ?? '08:00',
      salida:  this.empleado.horarioSalida  ?? '17:00'
    };

    // Si hay foto nueva seleccionada, convertirla a base64 y guardarla en fotoUrl
    if (this.fotoArchivo) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.empleado.fotoUrl = e.target?.result as string;
        this.enviarGuardado();
      };
      reader.readAsDataURL(this.fotoArchivo);
    } else {
      if (this.fotoEliminada) {
        this.empleado.fotoUrl = '';
      }
      this.enviarGuardado();
    }
  }

  private enviarGuardado() {
    this.guardando = true;
    const obs = this.esEdicion
      ? this.empService.update(this.empleado.id!, this.empleado)
      : this.empService.create(this.empleado);

    obs.subscribe({
      next: () => { this.guardando = false; this.router.navigate(['/admin/employees']); },
      error: () => { this.guardando = false; this.errorMsg = 'Error al guardar. Intenta de nuevo.'; }
    });
  }

  onTurnoChange(turnoId: string) {
    const turno = this.turnos.find(t => t.id === turnoId);
    this.empleado.turnoNombre = turno?.nombre;
  }

  volver() { this.router.navigate(['/admin/employees']); }
}
