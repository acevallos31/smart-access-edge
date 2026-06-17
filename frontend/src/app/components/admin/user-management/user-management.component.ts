// ============================================================
// GESTIÓN DE USUARIOS — Solo accesible para admins
// ============================================================
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
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../../services/auth.service';
import { EmployeeService } from '../../../services/employee.service';
import { Employee, RazonInactividad, ROLES_ADMIN } from '../../../models/models';

type ModalMode = 'none' | 'view' | 'create' | 'deactivate' | 'delete' | 'reactivate';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTooltipModule, MatBadgeModule
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
      <button mat-button class="nav-item active"><mat-icon>manage_accounts</mat-icon> Usuarios</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/turnos'])"><mat-icon>schedule</mat-icon> Turnos</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/attendance'])"><mat-icon>fact_check</mat-icon> Registros</button>
      <button mat-button class="nav-item" (click)="router.navigate(['/admin/reports'])"><mat-icon>bar_chart</mat-icon> Reportes</button>
    </nav>
    <button mat-button class="nav-item logout" (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
  </aside>

  <!-- MAIN -->
  <main class="main-content">
    <div class="page-header">
      <div>
        <h1>Gestión de <span class="accent">Usuarios</span></h1>
        <p class="page-subtitle">Administra cuentas, roles y estados del personal</p>
      </div>
      <button mat-raised-button color="primary" class="btn-nuevo" (click)="abrirCrear()">
        <mat-icon>person_add</mat-icon> Nuevo Usuario
      </button>
    </div>

    <!-- Estadísticas rápidas -->
    <div class="stats-row">
      <div class="stat-card stat-total">
        <mat-icon>people</mat-icon>
        <div>
          <span class="stat-num">{{ empleados.length }}</span>
          <span class="stat-label">Total usuarios</span>
        </div>
      </div>
      <div class="stat-card stat-activos">
        <mat-icon>check_circle</mat-icon>
        <div>
          <span class="stat-num">{{ empleadosActivos }}</span>
          <span class="stat-label">Activos</span>
        </div>
      </div>
      <div class="stat-card stat-inactivos">
        <mat-icon>cancel</mat-icon>
        <div>
          <span class="stat-num">{{ empleadosInactivos }}</span>
          <span class="stat-label">Inactivos</span>
        </div>
      </div>
      <div class="stat-card stat-admin">
        <mat-icon>admin_panel_settings</mat-icon>
        <div>
          <span class="stat-num">{{ empleadosAdmin }}</span>
          <span class="stat-label">Con acceso admin</span>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <mat-card class="filter-card">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Buscar usuario</mat-label>
        <input matInput [(ngModel)]="busqueda" (ngModelChange)="filtrar()" placeholder="Nombre, correo o departamento...">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <div class="filter-chips">
        <button mat-stroked-button [class.chip-active]="filtroEstado===''" (click)="setFiltro('')">Todos</button>
        <button mat-stroked-button [class.chip-active]="filtroEstado==='activo'" (click)="setFiltro('activo')">Activos</button>
        <button mat-stroked-button [class.chip-active]="filtroEstado==='inactivo'" (click)="setFiltro('inactivo')">Inactivos</button>
      </div>
    </mat-card>

    <!-- Tabla -->
    <mat-card class="table-card">
      <table mat-table [dataSource]="empleadosFiltrados" class="full-table">

        <!-- Nombre -->
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Usuario</th>
          <td mat-cell *matCellDef="let e">
            <div class="user-cell">
              <div class="user-avatar" [ngClass]="avatarClass(e.rol)">{{ e.nombre.charAt(0) }}</div>
              <div>
                <strong>{{ e.nombre }}</strong>
                <div class="user-email">{{ e.email ?? '—' }}</div>
              </div>
            </div>
          </td>
        </ng-container>

        <!-- Rol -->
        <ng-container matColumnDef="rol">
          <th mat-header-cell *matHeaderCellDef>Rol</th>
          <td mat-cell *matCellDef="let e">
            <span class="badge-rol" [ngClass]="rolClass(e.rol)">{{ e.rol ?? 'Empleado' }}</span>
          </td>
        </ng-container>

        <!-- Departamento -->
        <ng-container matColumnDef="departamento">
          <th mat-header-cell *matHeaderCellDef>Departamento</th>
          <td mat-cell *matCellDef="let e">{{ e.departamento }}</td>
        </ng-container>

        <!-- Contraseña -->
        <ng-container matColumnDef="password">
          <th mat-header-cell *matHeaderCellDef>Contraseña</th>
          <td mat-cell *matCellDef="let e">
            <div class="pwd-cell">
              <span>{{ passwordVisible[e.id!] ? (e.password ?? '—') : '••••••••' }}</span>
              <button mat-icon-button class="btn-eye" (click)="togglePwd(e.id!)">
                <mat-icon>{{ passwordVisible[e.id!] ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
          </td>
        </ng-container>

        <!-- Estado -->
        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let e">
            <div class="estado-cell">
              <span class="badge-estado" [ngClass]="e.activo ? 'badge-activo' : 'badge-inactivo'">
                <mat-icon class="estado-icon">{{ e.activo ? 'check_circle' : 'cancel' }}</mat-icon>
                {{ e.activo ? 'Activo' : 'Inactivo' }}
              </span>
              <span *ngIf="!e.activo && e.razonInactividad" class="razon-badge" [ngClass]="razonClass(e.razonInactividad)">
                {{ labelRazon(e.razonInactividad) }}
              </span>
            </div>
          </td>
        </ng-container>

        <!-- Acciones -->
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef>Acciones</th>
          <td mat-cell *matCellDef="let e">
            <button mat-icon-button color="primary" matTooltip="Ver detalles" (click)="verDetalles(e)">
              <mat-icon>visibility</mat-icon>
            </button>
            <button mat-icon-button color="accent" matTooltip="Editar" (click)="editar(e)">
              <mat-icon>edit</mat-icon>
            </button>
            <button *ngIf="e.activo" mat-icon-button color="warn"
                    matTooltip="Dar de baja" (click)="abrirDesactivar(e)">
              <mat-icon>person_off</mat-icon>
            </button>
            <button *ngIf="!e.activo" mat-icon-button color="primary"
                    matTooltip="Reactivar" (click)="abrirReactivar(e)">
              <mat-icon>person</mat-icon>
            </button>
            <button mat-icon-button class="btn-delete" matTooltip="Eliminar permanentemente" (click)="abrirEliminar(e)">
              <mat-icon>delete_forever</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let row; columns: columnas;" [class.row-inactivo]="!row.activo"></tr>
      </table>

      <div *ngIf="empleadosFiltrados.length === 0" class="empty-state">
        <mat-icon>manage_accounts</mat-icon>
        <p>No se encontraron usuarios</p>
      </div>
    </mat-card>
  </main>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- MODAL: VER DETALLES                                        -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="modal-overlay" *ngIf="modalMode === 'view' && selectedEmp" (click)="cerrarModal()">
  <div class="modal-box" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <div class="modal-avatar" [ngClass]="avatarClass(selectedEmp.rol)">{{ selectedEmp.nombre.charAt(0) }}</div>
      <div>
        <h2>{{ selectedEmp.nombre }}</h2>
        <span class="badge-rol" [ngClass]="rolClass(selectedEmp.rol)">{{ selectedEmp.rol ?? 'Empleado' }}</span>
      </div>
      <button mat-icon-button class="modal-close" (click)="cerrarModal()"><mat-icon>close</mat-icon></button>
    </div>

    <div class="modal-body">
      <div class="detail-grid">
        <div class="detail-item">
          <mat-icon>email</mat-icon>
          <div><label>Correo electrónico</label><span>{{ selectedEmp.email ?? '—' }}</span></div>
        </div>
        <div class="detail-item">
          <mat-icon>lock</mat-icon>
          <div>
            <label>Contraseña</label>
            <span class="pwd-detail">
              {{ pwdModalVisible ? (selectedEmp.password ?? '—') : '••••••••' }}
              <button mat-icon-button class="btn-eye-sm" (click)="pwdModalVisible=!pwdModalVisible">
                <mat-icon>{{ pwdModalVisible ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </span>
          </div>
        </div>
        <div class="detail-item">
          <mat-icon>business</mat-icon>
          <div><label>Departamento</label><span>{{ selectedEmp.departamento }}</span></div>
        </div>
        <div class="detail-item">
          <mat-icon>work</mat-icon>
          <div><label>Cargo</label><span>{{ selectedEmp.cargo }}</span></div>
        </div>
        <div class="detail-item">
          <mat-icon>schedule</mat-icon>
          <div><label>Horario</label><span>{{ selectedEmp.horarioEntrada ?? '—' }} – {{ selectedEmp.horarioSalida ?? '—' }}</span></div>
        </div>
        <div class="detail-item">
          <mat-icon>{{ selectedEmp.activo ? 'check_circle' : 'cancel' }}</mat-icon>
          <div>
            <label>Estado</label>
            <span>
              <span class="badge-estado" [ngClass]="selectedEmp.activo ? 'badge-activo' : 'badge-inactivo'">
                {{ selectedEmp.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </span>
          </div>
        </div>
        <div class="detail-item full" *ngIf="!selectedEmp.activo && selectedEmp.razonInactividad">
          <mat-icon>info</mat-icon>
          <div>
            <label>Razón de baja</label>
            <span>
              <span class="razon-badge" [ngClass]="razonClass(selectedEmp.razonInactividad)">
                {{ labelRazon(selectedEmp.razonInactividad) }}
              </span>
              <span *ngIf="selectedEmp.notaInactividad" class="nota-text">{{ selectedEmp.notaInactividad }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button mat-raised-button color="primary" (click)="editar(selectedEmp)"><mat-icon>edit</mat-icon> Editar</button>
      <button mat-stroked-button (click)="cerrarModal()">Cerrar</button>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- MODAL: CREAR / EDITAR USUARIO                              -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="modal-overlay" *ngIf="modalMode === 'create'" (click)="cerrarModal()">
  <div class="modal-box modal-form" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <mat-icon class="modal-icon-header" color="primary">{{ editandoId ? 'edit' : 'person_add' }}</mat-icon>
      <h2>{{ editandoId ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
      <button mat-icon-button class="modal-close" (click)="cerrarModal()"><mat-icon>close</mat-icon></button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nombre completo</mat-label>
          <input matInput [(ngModel)]="form.nombre" placeholder="Ej. Juan Pérez">
          <mat-icon matSuffix>person</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Correo electrónico</mat-label>
          <input matInput type="email" [(ngModel)]="form.email" placeholder="correo@empresa.com">
          <mat-icon matSuffix>email</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Contraseña</mat-label>
          <input matInput [type]="showFormPwd ? 'text' : 'password'" [(ngModel)]="form.password">
          <button mat-icon-button matSuffix (click)="showFormPwd=!showFormPwd" type="button">
            <mat-icon>{{ showFormPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Rol en el sistema</mat-label>
          <mat-select [(ngModel)]="form.rol">
            <mat-option value="Administrador">🔴 Administrador</mat-option>
            <mat-option value="Jefe">🔵 Jefe</mat-option>
            <mat-option value="Subjefe">🟣 Subjefe</mat-option>
            <mat-option value="Contador">🟤 Contador</mat-option>
            <mat-option value="Asistente del Jefe">🟠 Asistente del Jefe</mat-option>
            <mat-option value="Empleado">⚪ Empleado</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Departamento</mat-label>
          <input matInput [(ngModel)]="form.departamento" placeholder="Ej. Tecnología">
          <mat-icon matSuffix>business</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Cargo</mat-label>
          <input matInput [(ngModel)]="form.cargo" placeholder="Ej. Desarrollador">
          <mat-icon matSuffix>work</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Hora de entrada</mat-label>
          <input matInput type="time" [(ngModel)]="form.horarioEntrada">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Hora de salida</mat-label>
          <input matInput type="time" [(ngModel)]="form.horarioSalida">
        </mat-form-field>
      </div>

      <div *ngIf="form.rol && esAdmin(form.rol)" class="admin-notice">
        <mat-icon>admin_panel_settings</mat-icon>
        <span>Este rol tendrá <strong>acceso al panel de administración</strong></span>
      </div>
    </div>
    <div class="modal-footer">
      <button mat-raised-button color="primary" (click)="guardarUsuario()" [disabled]="!formValido()">
        <mat-icon>save</mat-icon> {{ editandoId ? 'Guardar cambios' : 'Crear usuario' }}
      </button>
      <button mat-stroked-button (click)="cerrarModal()">Cancelar</button>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- MODAL: DAR DE BAJA (con razón)                            -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="modal-overlay" *ngIf="modalMode === 'deactivate' && selectedEmp" (click)="cerrarModal()">
  <div class="modal-box" (click)="$event.stopPropagation()">
    <div class="modal-header centered">
      <mat-icon class="modal-icon-header warn-icon">person_off</mat-icon>
      <h2>Dar de baja: <em>{{ selectedEmp.nombre }}</em></h2>
    </div>
    <div class="modal-body">
      <p>Selecciona la razón por la cual este usuario quedará <strong>inactivo</strong>:</p>
      <div class="razon-opciones">
        <button class="razon-btn" [class.razon-selected]="bajaRazon==='despedido'" (click)="bajaRazon='despedido'">
          <mat-icon>gavel</mat-icon>
          <span>Despedido</span>
        </button>
        <button class="razon-btn" [class.razon-selected]="bajaRazon==='retirado'" (click)="bajaRazon='retirado'">
          <mat-icon>waving_hand</mat-icon>
          <span>Retirado</span>
        </button>
        <button class="razon-btn" [class.razon-selected]="bajaRazon==='otro'" (click)="bajaRazon='otro'">
          <mat-icon>more_horiz</mat-icon>
          <span>Otro</span>
        </button>
      </div>
      <mat-form-field appearance="outline" class="full" style="margin-top:1rem">
        <mat-label>Nota adicional (opcional)</mat-label>
        <textarea matInput [(ngModel)]="bajaNota" rows="2"
          placeholder="Ej. Contrato finalizado el 14/06/2026..."></textarea>
      </mat-form-field>
      <p class="aviso-historial"><mat-icon>info</mat-icon> El historial de asistencia se conservará.</p>
    </div>
    <div class="modal-footer">
      <button mat-raised-button color="warn" (click)="confirmarDesactivar()" [disabled]="!bajaRazon">
        <mat-icon>person_off</mat-icon> Dar de baja
      </button>
      <button mat-stroked-button (click)="cerrarModal()">Cancelar</button>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- MODAL: REACTIVAR                                           -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="modal-overlay" *ngIf="modalMode === 'reactivate' && selectedEmp" (click)="cerrarModal()">
  <div class="modal-box" (click)="$event.stopPropagation()">
    <div class="modal-header centered">
      <mat-icon class="modal-icon-header" color="primary">person</mat-icon>
      <h2>Reactivar a <em>{{ selectedEmp.nombre }}</em></h2>
    </div>
    <div class="modal-body">
      <p>¿Confirmas que deseas <strong>reactivar</strong> la cuenta de <strong>{{ selectedEmp.nombre }}</strong>?</p>
      <p>El usuario podrá iniciar sesión y registrar asistencia normalmente.</p>
    </div>
    <div class="modal-footer">
      <button mat-raised-button color="primary" (click)="confirmarReactivar()">
        <mat-icon>check_circle</mat-icon> Sí, reactivar
      </button>
      <button mat-stroked-button (click)="cerrarModal()">Cancelar</button>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- MODAL: ELIMINAR PERMANENTEMENTE                            -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="modal-overlay" *ngIf="modalMode === 'delete' && selectedEmp" (click)="cerrarModal()">
  <div class="modal-box" (click)="$event.stopPropagation()">
    <div class="modal-header centered">
      <mat-icon class="modal-icon-header warn-icon">delete_forever</mat-icon>
      <h2>Eliminar usuario</h2>
    </div>
    <div class="modal-body">
      <p class="delete-warn">
        Estás a punto de <strong>eliminar permanentemente</strong> a <strong>{{ selectedEmp.nombre }}</strong>.
      </p>
      <p>Esta acción <strong>no se puede deshacer</strong>. Se eliminará la cuenta y todos sus datos de acceso.</p>
      <p class="aviso-historial"><mat-icon>info</mat-icon> El historial de asistencia permanece en el sistema.</p>
    </div>
    <div class="modal-footer">
      <button mat-raised-button color="warn" (click)="confirmarEliminar()">
        <mat-icon>delete_forever</mat-icon> Eliminar permanentemente
      </button>
      <button mat-raised-button (click)="cerrarModal()">Cancelar</button>
    </div>
  </div>
</div>

<!-- Toast de notificación -->
<div class="toast" *ngIf="toastMsg" [ngClass]="toastType">
  <mat-icon>{{ toastType === 'toast-ok' ? 'check_circle' : 'error' }}</mat-icon>
  {{ toastMsg }}
</div>
  `,
  styles: [`
    /* ── Layout ─────────────────────────────────────────────── */
    .admin-layout { display:flex; min-height:100vh; background:#f1f5f9; font-family:'Segoe UI',sans-serif; }
    .sidebar { width:260px; background:#0f172a; color:#f1f5f9; display:flex; flex-direction:column; padding:1.5rem 1rem; gap:.25rem; flex-shrink:0; }
    .sidebar-brand { display:flex; align-items:center; gap:.5rem; color:#6ee7b7; font-weight:700; font-size:1rem; padding:.5rem .75rem 0; }
    .sidebar-role { color:#64748b; font-size:.78rem; padding:0 .75rem 1.5rem; }
    .sidebar-nav { flex:1; display:flex; flex-direction:column; gap:.25rem; }
    .nav-item { width:100%; justify-content:flex-start !important; color:#94a3b8 !important; border-radius:.75rem; padding:.5rem .75rem; gap:.75rem; }
    .nav-item:hover, .nav-item.active { background:rgba(110,231,183,.1) !important; color:#6ee7b7 !important; }
    .logout { color:#f87171 !important; margin-top:auto; }
    .main-content { flex:1; padding:2rem; display:flex; flex-direction:column; gap:1.5rem; min-width:0; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; }
    .page-header h1 { margin:0 0 .25rem; font-size:1.7rem; color:#0f172a; }
    .page-subtitle { margin:0; color:#64748b; font-size:.9rem; }
    .accent { color:#1565c0; }
    .btn-nuevo { border-radius:.75rem !important; }

    /* ── Stats ───────────────────────────────────────────────── */
    .stats-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:1rem; }
    .stat-card { background:#fff; border-radius:1rem; padding:1.25rem; display:flex; align-items:center; gap:1rem; box-shadow:0 1px 4px rgba(0,0,0,.06); }
    .stat-card mat-icon { font-size:2rem; width:2rem; height:2rem; }
    .stat-num { display:block; font-size:1.8rem; font-weight:700; line-height:1; }
    .stat-label { display:block; font-size:.78rem; color:#64748b; margin-top:.1rem; }
    .stat-total mat-icon { color:#1565c0; }
    .stat-activos mat-icon { color:#15803d; }
    .stat-inactivos mat-icon { color:#dc2626; }
    .stat-admin mat-icon { color:#7c3aed; }

    /* ── Filtros ────────────────────────────────────────────── */
    .filter-card { border-radius:1rem !important; padding:1.25rem; display:flex; gap:1rem; align-items:center; flex-wrap:wrap; }
    .search-field { flex:1; min-width:200px; }
    .filter-chips { display:flex; gap:.5rem; flex-wrap:wrap; }
    .chip-active { background:#dbeafe !important; color:#1565c0 !important; border-color:#1565c0 !important; }

    /* ── Tabla ─────────────────────────────────────────────── */
    .table-card { border-radius:1rem !important; overflow:hidden; }
    .full-table { width:100%; }
    .row-inactivo td { opacity:.7; }
    th.mat-header-cell { background:#f8fafc; font-weight:600; color:#475569; }

    .user-cell { display:flex; align-items:center; gap:.75rem; }
    .user-avatar { width:38px; height:38px; border-radius:50%; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1rem; flex-shrink:0; }
    .user-email { font-size:.78rem; color:#64748b; }
    .av-admin { background:linear-gradient(135deg,#7c3aed,#4f46e5); }
    .av-jefe  { background:linear-gradient(135deg,#1565c0,#1976d2); }
    .av-sub   { background:linear-gradient(135deg,#6d28d9,#8b5cf6); }
    .av-cont  { background:linear-gradient(135deg,#92400e,#b45309); }
    .av-asist { background:linear-gradient(135deg,#c2410c,#ea580c); }
    .av-emp   { background:linear-gradient(135deg,#0f766e,#14b8a6); }

    .badge-rol { font-size:.72rem; padding:.2rem .6rem; border-radius:999px; font-weight:600; white-space:nowrap; }
    .rol-admin { background:#ede9fe; color:#5b21b6; }
    .rol-jefe  { background:#dbeafe; color:#1e40af; }
    .rol-sub   { background:#f3e8ff; color:#7e22ce; }
    .rol-cont  { background:#fef3c7; color:#92400e; }
    .rol-asist { background:#ffedd5; color:#c2410c; }
    .rol-emp   { background:#f1f5f9; color:#475569; }

    .estado-cell { display:flex; flex-direction:column; gap:.2rem; }
    .badge-estado { display:inline-flex; align-items:center; gap:.2rem; font-size:.75rem; padding:.2rem .6rem; border-radius:999px; font-weight:600; }
    .estado-icon { font-size:.85rem !important; width:.85rem !important; height:.85rem !important; }
    .badge-activo   { background:#dcfce7; color:#15803d; }
    .badge-inactivo { background:#fee2e2; color:#dc2626; }
    .razon-badge { font-size:.7rem; padding:.15rem .5rem; border-radius:999px; font-weight:600; }
    .razon-despedido { background:#fee2e2; color:#991b1b; }
    .razon-retirado  { background:#fef9c3; color:#854d0e; }
    .razon-otro      { background:#f1f5f9; color:#475569; }

    .pwd-cell { display:flex; align-items:center; gap:.25rem; font-family:monospace; font-size:.85rem; }
    .btn-eye { width:28px !important; height:28px !important; line-height:28px !important; }
    .btn-eye mat-icon { font-size:16px; }
    .btn-delete { color:#dc2626 !important; }

    .empty-state { text-align:center; padding:3rem; color:#94a3b8; }
    .empty-state mat-icon { font-size:3rem; display:block; margin:0 auto .5rem; }

    /* ── Modales ─────────────────────────────────────────────── */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; z-index:1000; padding:1rem; }
    .modal-box { background:#fff; border-radius:1.25rem; max-width:520px; width:100%; box-shadow:0 24px 80px rgba(0,0,0,.25); display:flex; flex-direction:column; max-height:90vh; overflow:hidden; }
    .modal-form { max-width:640px; }
    .modal-header { display:flex; align-items:center; gap:1rem; padding:1.5rem 1.5rem 1rem; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
    .modal-header.centered { flex-direction:column; text-align:center; }
    .modal-header h2 { margin:0; font-size:1.2rem; color:#0f172a; flex:1; }
    .modal-close { margin-left:auto; }
    .modal-icon-header { font-size:2.5rem !important; width:2.5rem !important; height:2.5rem !important; }
    .warn-icon { color:#dc2626; }
    .modal-avatar { width:52px; height:52px; border-radius:50%; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1.4rem; flex-shrink:0; }
    .modal-body { padding:1.25rem 1.5rem; overflow-y:auto; flex:1; }
    .modal-footer { display:flex; gap:.75rem; padding:1rem 1.5rem; border-top:1px solid #f1f5f9; justify-content:flex-end; flex-wrap:wrap; flex-shrink:0; }

    /* Detalles */
    .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .detail-item { display:flex; align-items:flex-start; gap:.75rem; }
    .detail-item.full { grid-column:1/-1; }
    .detail-item mat-icon { color:#64748b; margin-top:.1rem; flex-shrink:0; }
    .detail-item label { display:block; font-size:.72rem; color:#94a3b8; text-transform:uppercase; letter-spacing:.04em; margin-bottom:.2rem; }
    .detail-item span { color:#0f172a; font-size:.9rem; display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; }
    .nota-text { display:block; font-size:.8rem; color:#64748b; margin-top:.25rem; }
    .pwd-detail { display:flex; align-items:center; gap:.25rem; font-family:monospace; }
    .btn-eye-sm { width:24px !important; height:24px !important; line-height:24px !important; }
    .btn-eye-sm mat-icon { font-size:14px; }

    /* Formulario */
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
    .form-grid .full { grid-column:1/-1; }
    .admin-notice { background:#ede9fe; border-left:4px solid #7c3aed; border-radius:.5rem; padding:.75rem 1rem; display:flex; align-items:center; gap:.5rem; color:#5b21b6; font-size:.88rem; margin-top:.5rem; }

    /* Razones de baja */
    .razon-opciones { display:grid; grid-template-columns:repeat(3,1fr); gap:.75rem; }
    .razon-btn { border:2px solid #e2e8f0; border-radius:.75rem; padding:1rem .5rem; background:#fff; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:.4rem; transition:all .2s; font-size:.85rem; color:#475569; }
    .razon-btn mat-icon { font-size:1.5rem; }
    .razon-btn:hover { border-color:#1565c0; color:#1565c0; background:#dbeafe; }
    .razon-selected { border-color:#dc2626 !important; color:#dc2626 !important; background:#fee2e2 !important; }
    .aviso-historial { display:flex; align-items:center; gap:.4rem; font-size:.82rem; color:#64748b; margin:.5rem 0 0; }
    .aviso-historial mat-icon { font-size:1rem; }
    .delete-warn { color:#dc2626; font-size:1rem; }

    /* Toast */
    .toast { position:fixed; bottom:2rem; right:2rem; border-radius:.75rem; padding:.9rem 1.5rem; display:flex; align-items:center; gap:.6rem; font-weight:600; z-index:2000; animation:fadeIn .3s ease; box-shadow:0 8px 24px rgba(0,0,0,.2); }
    .toast-ok  { background:#15803d; color:#fff; }
    .toast-err { background:#dc2626; color:#fff; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

    @media(max-width:600px) {
      .detail-grid, .form-grid { grid-template-columns:1fr; }
      .form-grid .full { grid-column:1; }
      .razon-opciones { grid-template-columns:1fr 1fr; }
    }
  `]
})
export class UserManagementComponent implements OnInit {

  columnas = ['nombre', 'rol', 'departamento', 'password', 'estado', 'acciones'];
  empleados: Employee[] = [];
  empleadosFiltrados: Employee[] = [];
  busqueda = '';
  filtroEstado = '';

  modalMode: ModalMode = 'none';
  selectedEmp: Employee | null = null;
  pwdModalVisible = false;

  // Formulario crear/editar
  editandoId: string | null = null;
  form: Partial<Employee> = {};
  showFormPwd = false;

  // Baja
  bajaRazon: RazonInactividad | '' = '';
  bajaNota = '';

  // Visibilidad de contraseñas en tabla
  passwordVisible: Record<string, boolean> = {};

  // Toast
  toastMsg = '';
  toastType = 'toast-ok';

  constructor(
    public auth: AuthService,
    private empService: EmployeeService,
    public router: Router
  ) {}

  ngOnInit() {
    this.cargarEmpleados();
  }

  cargarEmpleados() {
    this.empService.getAll().subscribe(e => {
      this.empleados = e;
      this.filtrar();
    });
  }

  // ── Estadísticas ─────────────────────────────────────────────
  get empleadosActivos()   { return this.empleados.filter(e => e.activo).length; }
  get empleadosInactivos() { return this.empleados.filter(e => !e.activo).length; }
  get empleadosAdmin()     { return this.empleados.filter(e => this.esAdmin(e.rol ?? '')).length; }

  // ── Filtros ──────────────────────────────────────────────────
  filtrar() {
    this.empleadosFiltrados = this.empleados.filter(e => {
      const b = this.busqueda.toLowerCase();
      const matchB = !b ||
        e.nombre.toLowerCase().includes(b) ||
        (e.email ?? '').toLowerCase().includes(b) ||
        e.departamento.toLowerCase().includes(b);
      const matchE =
        !this.filtroEstado ||
        (this.filtroEstado === 'activo' && e.activo) ||
        (this.filtroEstado === 'inactivo' && !e.activo);
      return matchB && matchE;
    });
  }

  setFiltro(f: string) { this.filtroEstado = f; this.filtrar(); }

  // ── Visibilidad contraseñas ───────────────────────────────────
  togglePwd(id: string) {
    this.passwordVisible[id] = !this.passwordVisible[id];
  }

  // ── Modales ──────────────────────────────────────────────────
  verDetalles(e: Employee)   { this.selectedEmp = e; this.pwdModalVisible = false; this.modalMode = 'view'; }
  abrirDesactivar(e: Employee) { this.selectedEmp = e; this.bajaRazon = ''; this.bajaNota = ''; this.modalMode = 'deactivate'; }
  abrirReactivar(e: Employee)  { this.selectedEmp = e; this.modalMode = 'reactivate'; }
  abrirEliminar(e: Employee)   { this.selectedEmp = e; this.modalMode = 'delete'; }

  abrirCrear() {
    this.editandoId = null;
    this.form = { rol: 'Empleado', activo: true };
    this.showFormPwd = false;
    this.modalMode = 'create';
  }

  editar(e: Employee) {
    this.editandoId = e.id ?? null;
    this.form = { ...e };
    this.showFormPwd = false;
    this.modalMode = 'create';
  }

  cerrarModal() { this.modalMode = 'none'; this.selectedEmp = null; }

  // ── Acciones ─────────────────────────────────────────────────
  confirmarDesactivar() {
    if (!this.selectedEmp || !this.bajaRazon) return;
    this.empService.deactivate(
      this.selectedEmp.id!,
      this.bajaRazon as RazonInactividad,
      this.bajaNota || undefined
    ).subscribe(() => {
      this.cargarEmpleados();
      this.cerrarModal();
      this.toast('Usuario dado de baja correctamente', 'ok');
    });
  }

  confirmarReactivar() {
    if (!this.selectedEmp) return;
    this.empService.activate(this.selectedEmp.id!).subscribe(() => {
      this.cargarEmpleados();
      this.cerrarModal();
      this.toast('Usuario reactivado correctamente', 'ok');
    });
  }

  confirmarEliminar() {
    if (!this.selectedEmp) return;
    this.empService.delete(this.selectedEmp.id!).subscribe(() => {
      this.cargarEmpleados();
      this.cerrarModal();
      this.toast('Usuario eliminado permanentemente', 'ok');
    });
  }

  guardarUsuario() {
    if (!this.formValido()) return;
    const emp: Employee = {
      nombre: this.form.nombre!,
      email: this.form.email,
      password: this.form.password,
      rol: this.form.rol as any,
      departamento: this.form.departamento!,
      cargo: this.form.cargo!,
      horarioEntrada: this.form.horarioEntrada,
      horarioSalida: this.form.horarioSalida,
      horario: this.form.horarioEntrada ? { entrada: this.form.horarioEntrada!, salida: this.form.horarioSalida! } : undefined,
      activo: true
    };

    if (this.editandoId) {
      this.empService.update(this.editandoId, emp).subscribe(() => {
        this.cargarEmpleados();
        this.cerrarModal();
        this.toast('Usuario actualizado correctamente', 'ok');
      });
    } else {
      this.empService.create(emp).subscribe(() => {
        this.cargarEmpleados();
        this.cerrarModal();
        this.toast('Usuario creado correctamente', 'ok');
      });
    }
  }

  formValido(): boolean {
    return !!(this.form.nombre && this.form.departamento && this.form.cargo);
  }

  // ── Helpers de estilos ────────────────────────────────────────
  esAdmin(rol: string): boolean {
    return ['Administrador','Jefe','Subjefe','Contador','Asistente del Jefe'].includes(rol);
  }

  avatarClass(rol?: string): string {
    switch (rol) {
      case 'Administrador':    return 'av-admin';
      case 'Jefe':             return 'av-jefe';
      case 'Subjefe':          return 'av-sub';
      case 'Contador':         return 'av-cont';
      case 'Asistente del Jefe': return 'av-asist';
      default:                 return 'av-emp';
    }
  }

  rolClass(rol?: string): string {
    switch (rol) {
      case 'Administrador':    return 'badge-rol rol-admin';
      case 'Jefe':             return 'badge-rol rol-jefe';
      case 'Subjefe':          return 'badge-rol rol-sub';
      case 'Contador':         return 'badge-rol rol-cont';
      case 'Asistente del Jefe': return 'badge-rol rol-asist';
      default:                 return 'badge-rol rol-emp';
    }
  }

  razonClass(r?: string): string {
    if (r === 'despedido') return 'razon-badge razon-despedido';
    if (r === 'retirado')  return 'razon-badge razon-retirado';
    return 'razon-badge razon-otro';
  }

  labelRazon(r?: string): string {
    if (r === 'despedido') return 'Despedido';
    if (r === 'retirado')  return 'Retirado';
    return 'Otro';
  }

  private toast(msg: string, type: 'ok' | 'err' = 'ok') {
    this.toastMsg  = msg;
    this.toastType = type === 'ok' ? 'toast-ok' : 'toast-err';
    setTimeout(() => this.toastMsg = '', 3500);
  }
}
