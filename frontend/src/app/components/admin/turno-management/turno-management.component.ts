// ============================================================
// GESTIÓN DE TURNOS — Panel Admin
// Permite crear turnos rotativos con horario por día
// ============================================================
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth.service';
import { TurnoService, Turno, HorarioDia } from '../../../services/turno.service';

type ModalMode = 'none' | 'form' | 'delete';
const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'] as const;
type DiaKey = typeof DIAS[number];
const DIAS_LABEL: Record<DiaKey, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
};

@Component({
  selector: 'app-turno-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatTooltipModule
  ],
  template: `
<div class="admin-layout">
  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="sidebar-brand"><mat-icon>fingerprint</mat-icon><span>Smart Access Edge</span></div>
    <div class="sidebar-role">{{ auth.usuarioActual?.rol }}</div>
    <nav class="sidebar-nav">
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/dashboard'])"><mat-icon>dashboard</mat-icon> Dashboard</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/employees'])"><mat-icon>group</mat-icon> Empleados</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/users'])"><mat-icon>manage_accounts</mat-icon> Usuarios</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/catalogs'])"><mat-icon>badge</mat-icon> Roles y Deptos</button>
      <button mat-button class="nav-item active"><mat-icon>schedule</mat-icon> Turnos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/attendance'])"><mat-icon>fact_check</mat-icon> Registros</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/reports'])"><mat-icon>bar_chart</mat-icon> Reportes</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/settings'])"><mat-icon>settings</mat-icon> Configuración</button>
    </nav>
    <button mat-button class="nav-item logout" (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
  </aside>

  <!-- MAIN -->
  <main class="main-content">
    <div class="page-header">
      <div>
        <h1>Gestión de <span class="accent">Turnos</span></h1>
        <p class="page-subtitle">Define horarios rotativos por día de la semana</p>
      </div>
      <button mat-raised-button color="primary" class="btn-nuevo" (click)="abrirCrear()">
        <mat-icon>add_circle</mat-icon> Nuevo Turno
      </button>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card"><mat-icon>schedule</mat-icon><div><span class="stat-num">{{ turnos.length }}</span><span class="stat-label">Total turnos</span></div></div>
      <div class="stat-card"><mat-icon style="color:#15803d">check_circle</mat-icon><div><span class="stat-num">{{ turnosActivos }}</span><span class="stat-label">Activos</span></div></div>
      <div class="stat-card"><mat-icon style="color:#dc2626">cancel</mat-icon><div><span class="stat-num">{{ turnosInactivos }}</span><span class="stat-label">Inactivos</span></div></div>
    </div>

    <!-- Grid de tarjetas de turnos -->
    <div class="turnos-grid" *ngIf="turnos.length > 0">
      <div class="turno-card" *ngFor="let t of turnos" [class.turno-inactivo]="!t.activo">
        <div class="turno-header">
          <div class="turno-icon">🕐</div>
          <div class="turno-info">
            <h3>{{ t.nombre }}</h3>
            <p>{{ t.descripcion || 'Sin descripción' }}</p>
          </div>
          <span class="badge-estado" [ngClass]="t.activo ? 'badge-activo' : 'badge-inactivo'">
            {{ t.activo ? 'Activo' : 'Inactivo' }}
          </span>
        </div>

        <!-- Horario por días -->
        <div class="dias-grid">
          <div *ngFor="let dia of diasKeys" class="dia-item"
               [class.dia-libre]="!t[dia] || !t[dia]!.trabaja">
            <span class="dia-nombre">{{ diasLabel[dia].substring(0,3) }}</span>
            <ng-container *ngIf="t[dia] && t[dia]!.trabaja; else libreBlock">
              <span class="dia-hora">{{ t[dia]!.entrada }}</span>
              <span class="dia-sep">→</span>
              <span class="dia-hora">{{ t[dia]!.salida }}</span>
            </ng-container>
            <ng-template #libreBlock>
              <span class="dia-libre-txt">Libre</span>
            </ng-template>
          </div>
        </div>

        <!-- Acciones -->
        <div class="turno-acciones">
          <button mat-icon-button color="primary" matTooltip="Editar" (click)="editar(t)">
            <mat-icon>edit</mat-icon>
          </button>
          <button *ngIf="t.activo" mat-icon-button color="warn" matTooltip="Desactivar" (click)="toggleActivo(t)">
            <mat-icon>pause_circle</mat-icon>
          </button>
          <button *ngIf="!t.activo" mat-icon-button color="primary" matTooltip="Activar" (click)="toggleActivo(t)">
            <mat-icon>play_circle</mat-icon>
          </button>
          <button mat-icon-button class="btn-delete" matTooltip="Eliminar" (click)="abrirEliminar(t)">
            <mat-icon>delete_forever</mat-icon>
          </button>
        </div>
      </div>
    </div>

    <div *ngIf="turnos.length === 0" class="empty-state">
      <span style="font-size:3rem">📅</span>
      <p>No hay turnos creados. Crea el primero.</p>
    </div>

  </main>
</div>

<!-- ══ MODAL: CREAR / EDITAR ════════════════════════════════ -->
<div class="modal-overlay" *ngIf="modalMode === 'form'" (click)="cerrarModal()">
  <div class="modal-box modal-lg" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <mat-icon color="primary" class="modal-icon-h">schedule</mat-icon>
      <h2>{{ editandoId ? 'Editar turno' : 'Nuevo turno' }}</h2>
      <button mat-icon-button class="modal-close" (click)="cerrarModal()"><mat-icon>close</mat-icon></button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nombre del turno</mat-label>
          <input matInput [(ngModel)]="form.nombre" placeholder="Ej. Turno Mañana, Turno Noche">
          <mat-icon matSuffix>schedule</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Descripción (opcional)</mat-label>
          <input matInput [(ngModel)]="form.descripcion" placeholder="Ej. Horario rotativo semana par">
        </mat-form-field>
      </div>

      <p class="dias-section-title">⏱ Configura el horario por día:</p>

      <div class="dias-form-grid">
        <div *ngFor="let dia of diasKeys" class="dia-form-row">
          <label class="dia-form-label">{{ diasLabel[dia] }}</label>
          <label class="switch-wrap">
            <input type="checkbox" [(ngModel)]="formDias[dia].trabaja">
            <span class="switch-slider"></span>
          </label>
          <span class="dia-form-status">{{ formDias[dia].trabaja ? 'Trabaja' : 'Libre' }}</span>
          <ng-container *ngIf="formDias[dia].trabaja">
            <input type="time" class="time-input" [(ngModel)]="formDias[dia].entrada">
            <span class="dia-sep">→</span>
            <input type="time" class="time-input" [(ngModel)]="formDias[dia].salida">
          </ng-container>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button mat-raised-button color="primary" (click)="guardarTurno()" [disabled]="!form.nombre">
        <mat-icon>save</mat-icon> {{ editandoId ? 'Guardar cambios' : 'Crear turno' }}
      </button>
      <button mat-stroked-button (click)="cerrarModal()">Cancelar</button>
    </div>
  </div>
</div>

<!-- ══ MODAL: ELIMINAR ══════════════════════════════════════ -->
<div class="modal-overlay" *ngIf="modalMode === 'delete' && selectedTurno" (click)="cerrarModal()">
  <div class="modal-box" (click)="$event.stopPropagation()">
    <div class="modal-header centered">
      <mat-icon class="modal-icon-h warn-icon">delete_forever</mat-icon>
      <h2>Eliminar turno</h2>
    </div>
    <div class="modal-body">
      <p class="delete-warn">¿Eliminar permanentemente el turno <strong>{{ selectedTurno.nombre }}</strong>?</p>
      <p>Los empleados asignados a este turno <strong>no tendrán horario</strong> hasta que se les asigne uno nuevo.</p>
    </div>
    <div class="modal-footer">
      <button mat-raised-button color="warn" (click)="confirmarEliminar()"><mat-icon>delete_forever</mat-icon> Eliminar</button>
      <button mat-raised-button (click)="cerrarModal()">Cancelar</button>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="toast" *ngIf="toastMsg" [ngClass]="toastType">
  <mat-icon>{{ toastType === 'toast-ok' ? 'check_circle' : 'error' }}</mat-icon> {{ toastMsg }}
</div>
  `,
  styles: [`
    /* Layout */
    .admin-layout { display:flex; min-height:100vh; background:#f1f5f9; font-family:'Segoe UI',sans-serif; }
    .sidebar { width:260px; background:#0f172a; color:#f1f5f9; display:flex; flex-direction:column; padding:1.5rem 1rem; gap:.25rem; flex-shrink:0; }
    .sidebar-brand { display:flex; align-items:center; gap:.5rem; color:#6ee7b7; font-weight:700; font-size:1rem; padding:.5rem .75rem 0; }
    .sidebar-role { color:#64748b; font-size:.78rem; padding:0 .75rem 1.5rem; }
    .sidebar-nav { flex:1; display:flex; flex-direction:column; gap:.25rem; overflow:auto; }
    .nav-item { width:100%; justify-content:flex-start !important; color:#94a3b8 !important; border-radius:.75rem; padding:.5rem .75rem; gap:.75rem; }
    .nav-item:hover, .nav-item.active { background:rgba(110,231,183,.1) !important; color:#6ee7b7 !important; }
    .logout { color:#f87171 !important; margin-top:auto; }
    .main-content { flex:1; padding:2rem; display:flex; flex-direction:column; gap:1.5rem; min-width:0; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; }
    .page-header h1 { margin:0 0 .25rem; font-size:1.7rem; color:#0f172a; }
    .page-subtitle { margin:0; color:#64748b; font-size:.9rem; }
    .accent { color:#1565c0; }
    /* Stats */
    .stats-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:1rem; }
    .stat-card { background:#fff; border-radius:1rem; padding:1.25rem; display:flex; align-items:center; gap:1rem; box-shadow:0 1px 4px rgba(0,0,0,.06); }
    .stat-card mat-icon { font-size:2rem; width:2rem; height:2rem; color:#1565c0; }
    .stat-num { display:block; font-size:1.8rem; font-weight:700; line-height:1; }
    .stat-label { display:block; font-size:.78rem; color:#64748b; }
    /* Turnos grid */
    .turnos-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(380px,1fr)); gap:1.25rem; }
    .turno-card { background:#fff; border-radius:1.25rem; padding:1.5rem; box-shadow:0 2px 8px rgba(0,0,0,.07); border:2px solid transparent; transition:.2s; }
    .turno-card:hover { border-color:#1565c0; }
    .turno-inactivo { opacity:.6; }
    .turno-header { display:flex; align-items:flex-start; gap:.75rem; margin-bottom:1.25rem; }
    .turno-icon { font-size:2rem; }
    .turno-info h3 { margin:0 0 .2rem; font-size:1.05rem; color:#0f172a; }
    .turno-info p  { margin:0; font-size:.8rem; color:#64748b; }
    .badge-estado { font-size:.72rem; padding:.2rem .65rem; border-radius:999px; font-weight:600; margin-left:auto; white-space:nowrap; }
    .badge-activo   { background:#dcfce7; color:#15803d; }
    .badge-inactivo { background:#fee2e2; color:#dc2626; }
    /* Días grid */
    .dias-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:.3rem; margin-bottom:1rem; }
    .dia-item { background:#f8fafc; border-radius:.5rem; padding:.4rem .25rem; text-align:center; font-size:.72rem; }
    .dia-libre { background:#f1f5f9; opacity:.5; }
    .dia-nombre { display:block; font-weight:700; color:#475569; margin-bottom:.15rem; }
    .dia-hora { display:block; color:#0f172a; font-weight:600; font-size:.68rem; }
    .dia-sep { display:block; color:#94a3b8; font-size:.6rem; }
    .dia-libre-txt { display:block; color:#94a3b8; font-size:.68rem; margin-top:.2rem; }
    .turno-acciones { display:flex; justify-content:flex-end; gap:.25rem; border-top:1px solid #f1f5f9; padding-top:.75rem; }
    .btn-delete { color:#dc2626 !important; }
    .empty-state { text-align:center; padding:3rem; color:#94a3b8; }
    /* Modal */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; z-index:1000; padding:1rem; }
    .modal-box { background:#fff; border-radius:1.25rem; max-width:520px; width:100%; box-shadow:0 24px 80px rgba(0,0,0,.25); display:flex; flex-direction:column; max-height:92vh; overflow:hidden; }
    .modal-lg { max-width:700px; }
    .modal-header { display:flex; align-items:center; gap:1rem; padding:1.5rem 1.5rem 1rem; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
    .modal-header.centered { flex-direction:column; text-align:center; }
    .modal-header h2 { margin:0; font-size:1.2rem; color:#0f172a; flex:1; }
    .modal-close { margin-left:auto; }
    .modal-icon-h { font-size:2rem !important; width:2rem !important; height:2rem !important; }
    .warn-icon { color:#dc2626; }
    .modal-body { padding:1.25rem 1.5rem; overflow-y:auto; flex:1; }
    .modal-footer { display:flex; gap:.75rem; padding:1rem 1.5rem; border-top:1px solid #f1f5f9; justify-content:flex-end; flex-shrink:0; }
    /* Form */
    .form-row { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; margin-bottom:1rem; }
    .form-row .full { grid-column:1/-1; }
    .dias-section-title { font-weight:600; color:#0f172a; margin:.5rem 0 .75rem; }
    .dias-form-grid { display:flex; flex-direction:column; gap:.6rem; }
    .dia-form-row { display:flex; align-items:center; gap:.75rem; background:#f8fafc; border-radius:.75rem; padding:.5rem .75rem; flex-wrap:wrap; }
    .dia-form-label { font-weight:600; color:#0f172a; width:90px; flex-shrink:0; font-size:.9rem; }
    .dia-form-status { font-size:.8rem; color:#64748b; width:50px; }
    .switch-wrap { position:relative; display:inline-block; width:40px; height:22px; flex-shrink:0; }
    .switch-wrap input { opacity:0; width:0; height:0; }
    .switch-slider { position:absolute; cursor:pointer; inset:0; background:#e2e8f0; border-radius:22px; transition:.3s; }
    .switch-wrap input:checked + .switch-slider { background:#2e7d32; }
    .switch-slider:before { content:''; position:absolute; height:16px; width:16px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:.3s; }
    .switch-wrap input:checked + .switch-slider:before { transform:translateX(18px); }
    .time-input { border:1px solid #e2e8f0; border-radius:.5rem; padding:.35rem .5rem; font-size:.85rem; width:80px; }
    .dia-sep { color:#94a3b8; font-size:.9rem; }
    .delete-warn { color:#dc2626; }
    /* Toast */
    .toast { position:fixed; bottom:2rem; right:2rem; border-radius:.75rem; padding:.9rem 1.5rem; display:flex; align-items:center; gap:.6rem; font-weight:600; z-index:2000; box-shadow:0 8px 24px rgba(0,0,0,.2); }
    .toast-ok  { background:#15803d; color:#fff; }
    .toast-err { background:#dc2626; color:#fff; }
  `]
})
export class TurnoManagementComponent implements OnInit {

  turnos: Turno[] = [];
  modalMode: ModalMode = 'none';
  selectedTurno: Turno | null = null;
  editandoId: string | null = null;

  form: Partial<Turno> = { nombre: '', descripcion: '' };
  formDias: Record<DiaKey, HorarioDia> = this.defaultDias();

  readonly diasKeys = DIAS;
  readonly diasLabel = DIAS_LABEL;

  toastMsg  = '';
  toastType = 'toast-ok';

  constructor(
    public auth:   AuthService,
    private svc:   TurnoService,
    public router: Router
  ) {}

  ngOnInit() { this.cargar(); }

  cargar() { this.svc.getAll().subscribe(t => this.turnos = t); }

  get turnosActivos()   { return this.turnos.filter(t => t.activo).length; }
  get turnosInactivos() { return this.turnos.filter(t => !t.activo).length; }

  abrirCrear() {
    this.editandoId = null;
    this.form       = { nombre: '', descripcion: '' };
    this.formDias   = this.defaultDias();
    this.modalMode  = 'form';
  }

  editar(t: Turno) {
    this.editandoId = t.id ?? null;
    this.form       = { nombre: t.nombre, descripcion: t.descripcion };
    this.formDias   = {
      lunes:     t.lunes     ? { ...t.lunes }     : { entrada:'08:00', salida:'17:00', trabaja:true },
      martes:    t.martes    ? { ...t.martes }    : { entrada:'08:00', salida:'17:00', trabaja:true },
      miercoles: t.miercoles ? { ...t.miercoles } : { entrada:'08:00', salida:'17:00', trabaja:true },
      jueves:    t.jueves    ? { ...t.jueves }    : { entrada:'08:00', salida:'17:00', trabaja:true },
      viernes:   t.viernes   ? { ...t.viernes }   : { entrada:'08:00', salida:'17:00', trabaja:true },
      sabado:    t.sabado    ? { ...t.sabado }    : { entrada:'08:00', salida:'12:00', trabaja:false },
      domingo:   t.domingo   ? { ...t.domingo }   : { entrada:'08:00', salida:'12:00', trabaja:false }
    };
    this.modalMode = 'form';
  }

  abrirEliminar(t: Turno) { this.selectedTurno = t; this.modalMode = 'delete'; }
  cerrarModal() { this.modalMode = 'none'; this.selectedTurno = null; }

  guardarTurno() {
    if (!this.form.nombre) return;
    const payload: Omit<Turno,'id'> = {
      nombre:      this.form.nombre,
      descripcion: this.form.descripcion,
      activo:      true,
      ...this.formDias
    };

    if (this.editandoId) {
      this.svc.update(this.editandoId, payload).subscribe(() => {
        this.cargar(); this.cerrarModal(); this.toast('Turno actualizado', 'ok');
      });
    } else {
      this.svc.create(payload).subscribe(() => {
        this.cargar(); this.cerrarModal(); this.toast('Turno creado correctamente', 'ok');
      });
    }
  }

  toggleActivo(t: Turno) {
    const obs = t.activo ? this.svc.deactivate(t.id!) : this.svc.activate(t.id!);
    obs.subscribe(() => { this.cargar(); this.toast(t.activo ? 'Turno desactivado' : 'Turno activado', 'ok'); });
  }

  confirmarEliminar() {
    if (!this.selectedTurno) return;
    this.svc.delete(this.selectedTurno.id!).subscribe(() => {
      this.cargar(); this.cerrarModal(); this.toast('Turno eliminado', 'ok');
    });
  }

  private defaultDias(): Record<DiaKey, HorarioDia> {
    return {
      lunes:     { entrada:'08:00', salida:'17:00', trabaja:true },
      martes:    { entrada:'08:00', salida:'17:00', trabaja:true },
      miercoles: { entrada:'08:00', salida:'17:00', trabaja:true },
      jueves:    { entrada:'08:00', salida:'17:00', trabaja:true },
      viernes:   { entrada:'08:00', salida:'17:00', trabaja:true },
      sabado:    { entrada:'08:00', salida:'12:00', trabaja:false },
      domingo:   { entrada:'08:00', salida:'12:00', trabaja:false }
    };
  }

  private toast(msg: string, type: 'ok' | 'err') {
    this.toastMsg  = msg;
    this.toastType = type === 'ok' ? 'toast-ok' : 'toast-err';
    setTimeout(() => this.toastMsg = '', 3500);
  }
}
