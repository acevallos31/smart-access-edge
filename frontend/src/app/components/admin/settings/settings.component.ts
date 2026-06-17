import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { SettingsService, AppSettings } from '../../../services/settings.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatSlideToggleModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
<div class="settings-container">
  <div class="settings-header">
    <h1>⚙️ Configuración del Sistema</h1>
    <p>Gestiona opciones de verificación facial y TPU</p>
  </div>

  <!-- ══ VERIFICACIÓN FACIAL ════════════════════════════════════ -->
  <mat-card class="settings-card">
    <mat-card-header>
      <mat-card-title>
        <mat-icon>face</mat-icon>
        Verificación Facial (TPU)
      </mat-card-title>
      <mat-card-subtitle>Controla el servidor de inferencia</mat-card-subtitle>
    </mat-card-header>

    <mat-card-content>
      <!-- Toggle TPU -->
      <div class="setting-row">
        <div class="setting-label">
          <h3>Habilitar Verificación TPU</h3>
          <p class="desc">Si está deshabilitado, el check-in no requiere verificación facial</p>
        </div>
        <mat-slide-toggle
          [checked]="settings.enableFaceVerificationTPU"
          (change)="onToggleFaceVerification($event.checked)">
        </mat-slide-toggle>
      </div>

      <!-- URL del Servidor -->
      <div class="setting-row">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>URL del Servidor TPU</mat-label>
          <input matInput
            [(ngModel)]="settings.tpuServerUrl"
            [disabled]="!settings.enableFaceVerificationTPU"
            placeholder="https://inference-api.nocpbx.com">
          <button mat-icon-button matSuffix (click)="guardarURL()" [disabled]="!settings.enableFaceVerificationTPU">
            <mat-icon>check_circle</mat-icon>
          </button>
        </mat-form-field>
      </div>

      <!-- Health Check -->
      <div class="setting-row">
        <button mat-raised-button
          (click)="verificarSaludTPU()"
          [disabled]="!settings.enableFaceVerificationTPU || verificandoSalud">
          <mat-icon *ngIf="!verificandoSalud">cloud_check</mat-icon>
          <mat-spinner *ngIf="verificandoSalud" diameter="20" class="inline-spinner"></mat-spinner>
          {{ verificandoSalud ? 'Verificando...' : 'Verificar Disponibilidad' }}
        </button>
        <span *ngIf="statusTPU" [class]="'status ' + statusTPU.status">
          {{ statusTPU.mensaje }}
        </span>
      </div>

      <!-- Modo estricto -->
      <div class="setting-row">
        <div class="setting-label">
          <h3>Modo Estricto Facial</h3>
          <p class="desc">Si está activado, no se permite fallback por falla de TPU: el rostro debe verificarse para registrar.</p>
        </div>
        <mat-slide-toggle
          [checked]="settings.strictFaceVerification"
          [disabled]="!settings.enableFaceVerificationTPU"
          (change)="onToggleStrictFace($event.checked)">
        </mat-slide-toggle>
      </div>

      <!-- Photo Storage -->
      <div class="setting-row">
        <div class="setting-label">
          <h3>Almacenamiento de Fotos</h3>
          <p class="desc">Guardar fotos de empleados en Firebase Storage</p>
        </div>
        <mat-slide-toggle
          [checked]="settings.photoStorageEnabled"
          (change)="onTogglePhotoStorage($event.checked)">
        </mat-slide-toggle>
      </div>
    </mat-card-content>

    <mat-card-actions>
      <button mat-stroked-button (click)="reiniciarConfiguracion()">
        <mat-icon>restore</mat-icon>
        Restaurar Valores Por Defecto
      </button>
    </mat-card-actions>
  </mat-card>

  <!-- ══ ESTADO DEL SISTEMA ═════════════════════════════════════ -->
  <mat-card class="settings-card info-card">
    <mat-card-header>
      <mat-card-title>
        <mat-icon>info</mat-icon>
        Estado del Sistema
      </mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <div class="status-item">
        <span class="label">Verificación TPU:</span>
        <span [class]="'badge ' + (settings.enableFaceVerificationTPU ? 'enabled' : 'disabled')">
          {{ settings.enableFaceVerificationTPU ? '✓ Habilitada' : '✗ Deshabilitada' }}
        </span>
      </div>
      <div class="status-item">
        <span class="label">Servidor TPU:</span>
        <code>{{ settings.tpuServerUrl }}</code>
      </div>
      <div class="status-item">
        <span class="label">Modo Estricto:</span>
        <span [class]="'badge ' + (settings.strictFaceVerification ? 'enabled' : 'disabled')">
          {{ settings.strictFaceVerification ? '✓ Activado' : '✗ Desactivado' }}
        </span>
      </div>
      <div class="status-item">
        <span class="label">Almacenamiento de Fotos:</span>
        <span [class]="'badge ' + (settings.photoStorageEnabled ? 'enabled' : 'disabled')">
          {{ settings.photoStorageEnabled ? '✓ Habilitado' : '✗ Deshabilitado' }}
        </span>
      </div>
    </mat-card-content>
  </mat-card>
</div>
  `,
  styles: [`
    .settings-container {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .settings-header {
      margin-bottom: 2rem;
    }
    .settings-header h1 { font-size: 2rem; margin: 0; }
    .settings-header p { color: #666; margin: 0.5rem 0 0; }

    .settings-card {
      margin-bottom: 1.5rem;
    }
    .settings-card mat-card-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .settings-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-size: 1.3rem;
    }
    .settings-card mat-card-subtitle { margin: 0.5rem 0 0; }

    .info-card {
      background: #f8f9fa;
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 0;
      border-bottom: 1px solid #eee;
    }
    .setting-row:last-child { border-bottom: none; }

    .setting-label {
      flex: 1;
    }
    .setting-label h3 { margin: 0; font-size: 1rem; }
    .setting-label .desc { font-size: 0.85rem; color: #999; margin: 0.25rem 0 0; }

    .full-width {
      width: 100%;
      max-width: 300px;
    }

    .status {
      margin-left: 1rem;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }
    .status.success {
      background: #d4edda;
      color: #155724;
    }
    .status.error {
      background: #f8d7da;
      color: #721c24;
    }

    mat-card-actions {
      display: flex;
      gap: 0.5rem;
      padding-top: 1rem;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .status-item .label {
      font-weight: 600;
      color: #333;
    }
    .status-item code {
      background: #f5f5f5;
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9rem;
    }
    .status-item .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .status-item .badge.enabled {
      background: #d4edda;
      color: #155724;
    }
    .status-item .badge.disabled {
      background: #f8d7da;
      color: #721c24;
    }

    .inline-spinner {
      display: inline-block;
      margin-right: 0.5rem;
    }
  `]
})
export class SettingsComponent implements OnInit {

  settings: AppSettings;
  verificandoSalud = false;
  statusTPU: { status: 'success' | 'error'; mensaje: string } | null = null;

  constructor(
    private settingsService: SettingsService,
    private http: HttpClient,
    private auth: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.settings = this.settingsService.obtenerConfiguracion();
  }

  ngOnInit(): void {
    this.settingsService.settings$.subscribe(settings => {
      this.settings = settings;
    });
  }

  onToggleFaceVerification(enabled: boolean): void {
    this.settingsService.toggleFaceVerificationTPU(enabled);
    if (!enabled && this.settings.strictFaceVerification) {
      this.settingsService.toggleStrictFaceVerification(false);
    }
    this.mostrarNotificacion(
      enabled ? 'Verificación TPU habilitada' : 'Verificación TPU deshabilitada'
    );
  }

  onToggleStrictFace(enabled: boolean): void {
    this.settingsService.toggleStrictFaceVerification(enabled);
    this.mostrarNotificacion(
      enabled ? 'Modo estricto facial activado' : 'Modo estricto facial desactivado'
    );
  }

  onTogglePhotoStorage(enabled: boolean): void {
    this.settingsService.actualizarConfiguracion({ photoStorageEnabled: enabled });
    this.mostrarNotificacion(
      enabled ? 'Almacenamiento de fotos habilitado' : 'Almacenamiento de fotos deshabilitado'
    );
  }

  guardarURL(): void {
    this.settingsService.cambiarServidorTPU(this.settings.tpuServerUrl);
    this.mostrarNotificacion('URL del servidor TPU actualizada');
  }

  async verificarSaludTPU(): Promise<void> {
    this.verificandoSalud = true;
    this.statusTPU = null;

    try {
      const token = this.auth.usuarioActual?.token ?? this.auth.usuarioActual?.idToken ?? '';
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

      const response = await this.http.post<any>(
        `${environment.apiUrl}/settings/face-verification/health`,
        {},
        { headers }
      ).toPromise();

      if (response?.available) {
        this.statusTPU = { status: 'success', mensaje: '✓ Servidor disponible' };
      } else {
        this.statusTPU = { status: 'error', mensaje: '✗ Servidor no disponible' };
      }
    } catch (err) {
      this.statusTPU = { status: 'error', mensaje: '✗ Error verificando servidor' };
    } finally {
      this.verificandoSalud = false;
    }
  }

  reiniciarConfiguracion(): void {
    if (confirm('¿Restaurar todas las configuraciones a valores por defecto?')) {
      this.settingsService.reiniciarConfiguracion();
      this.mostrarNotificacion('Configuración restaurada');
    }
  }

  private mostrarNotificacion(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
  }
}
