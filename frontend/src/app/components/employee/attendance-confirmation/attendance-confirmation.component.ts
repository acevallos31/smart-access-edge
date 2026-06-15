import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-attendance-confirmation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <div class="confirm-container">
      <mat-card class="confirm-card">

        <!-- Ícono de éxito animado -->
        <div class="success-icon">
          <div class="circle-bg">
            <mat-icon>check_circle</mat-icon>
          </div>
        </div>

        <h1>¡Registro Exitoso!</h1>
        <p class="subtitle">Tu asistencia ha sido registrada correctamente</p>

        <!-- Detalles del registro -->
        <div class="details-grid" *ngIf="detalles">
          <div class="detail-item">
            <mat-icon>person</mat-icon>
            <div>
              <span class="label">Empleado</span>
              <span class="value">{{ detalles.nombre }}</span>
            </div>
          </div>
          <div class="detail-item">
            <mat-icon>login</mat-icon>
            <div>
              <span class="label">Tipo</span>
              <span class="value">{{ detalles.tipo | titlecase }}</span>
            </div>
          </div>
          <div class="detail-item">
            <mat-icon>schedule</mat-icon>
            <div>
              <span class="label">Hora registrada</span>
              <span class="value">{{ detalles.hora }}</span>
            </div>
          </div>
          <div class="detail-item">
            <mat-icon>fact_check</mat-icon>
            <div>
              <span class="label">Estado</span>
              <span class="value status" [class.puntual]="detalles.status === 'puntual'" [class.tardanza]="detalles.status === 'tardanza'">
                {{ detalles.status | titlecase }}
              </span>
            </div>
          </div>
        </div>

        <!-- Mensaje por defecto si no hay detalles -->
        <div class="default-msg" *ngIf="!detalles">
          <p>Hora: <strong>{{ horaActual }}</strong></p>
        </div>

        <!-- Cuenta regresiva -->
        <p class="redirect-msg">Regresando al inicio en <strong>{{ countdown }}</strong> segundos...</p>

        <div class="actions">
          <button mat-raised-button color="primary" (click)="irAlDashboard()">
            <mat-icon>dashboard</mat-icon>
            Ir al Dashboard
          </button>
          <button mat-stroked-button (click)="nuevoRegistro()">
            <mat-icon>camera_alt</mat-icon>
            Nuevo Registro
          </button>
        </div>

      </mat-card>
    </div>
  `,
  styles: [`
    .confirm-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .confirm-card {
      max-width: 480px;
      width: 100%;
      text-align: center;
      padding: 40px 32px;
      border-radius: 16px;
    }
    .success-icon {
      margin-bottom: 24px;
    }
    .circle-bg {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #e8f5e9;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      animation: pop 0.4s ease-out;
    }
    .circle-bg mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #4caf50;
    }
    @keyframes pop {
      0%   { transform: scale(0); opacity: 0; }
      70%  { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    h1 { color: #1a237e; margin: 0 0 8px; font-size: 1.8rem; }
    .subtitle { color: #666; margin-bottom: 28px; }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f5f5f5;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      text-align: left;
    }
    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .detail-item mat-icon { color: #7c4dff; margin-top: 2px; }
    .label { display: block; font-size: 0.75rem; color: #888; }
    .value { display: block; font-weight: 600; color: #222; font-size: 0.95rem; }
    .status.puntual  { color: #2e7d32; }
    .status.tardanza { color: #e65100; }
    .default-msg p { font-size: 1.1rem; color: #333; }
    .redirect-msg { color: #999; font-size: 0.9rem; margin: 12px 0 24px; }
    .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  `]
})
export class AttendanceConfirmationComponent implements OnInit {

  detalles: { nombre: string; tipo: string; hora: string; status: string } | null = null;
  horaActual = new Date().toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
  countdown = 5;
  private timer: any;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Recuperar detalles pasados por navegación
    const nav = this.router.getCurrentNavigation();
    const state = (history.state as any);
    if (state?.detalles) {
      this.detalles = state.detalles;
    }

    // Cuenta regresiva para redirigir
    this.timer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.timer);
        this.irAlDashboard();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  irAlDashboard(): void {
    this.router.navigate(['/employee/dashboard']);
  }

  nuevoRegistro(): void {
    this.router.navigate(['/employee/check-in']);
  }
}
