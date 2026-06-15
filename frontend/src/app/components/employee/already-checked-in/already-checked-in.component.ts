import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-already-checked-in',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <div class="blocked-container">
      <mat-card class="blocked-card">

        <!-- Ícono de bloqueo -->
        <div class="block-icon">
          <div class="circle-bg">
            <mat-icon>block</mat-icon>
          </div>
        </div>

        <h1>Ya Registrado</h1>
        <p class="subtitle">Ya has registrado tu entrada en este turno</p>

        <!-- Detalles del último registro -->
        <div class="last-record" *ngIf="lastRecord">
          <mat-icon>history</mat-icon>
          <div>
            <span class="label">Último registro</span>
            <span class="value">{{ lastRecord }}</span>
          </div>
        </div>

        <div class="info-box">
          <mat-icon>info</mat-icon>
          <p>
            No es posible modificar un registro ya confirmado. Si necesitas registrar tu
            <strong>salida</strong>, usa el botón de abajo.
          </p>
        </div>

        <!-- Nombre del usuario -->
        <div class="user-info" *ngIf="userName">
          <mat-icon>person</mat-icon>
          <span>{{ userName }}</span>
        </div>

        <div class="actions">
          <button mat-raised-button color="warn" (click)="registrarSalida()">
            <mat-icon>logout</mat-icon>
            Registrar Salida
          </button>
          <button mat-stroked-button (click)="irAlDashboard()">
            <mat-icon>dashboard</mat-icon>
            Ir al Dashboard
          </button>
        </div>

      </mat-card>
    </div>
  `,
  styles: [`
    .blocked-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      padding: 20px;
    }
    .blocked-card {
      max-width: 460px;
      width: 100%;
      text-align: center;
      padding: 40px 32px;
      border-radius: 16px;
    }
    .block-icon { margin-bottom: 24px; }
    .circle-bg {
      width: 80px; height: 80px; border-radius: 50%;
      background: #fce4ec; display: flex;
      align-items: center; justify-content: center;
      margin: 0 auto;
    }
    .circle-bg mat-icon { font-size: 48px; width: 48px; height: 48px; color: #c62828; }
    h1 { color: #b71c1c; margin: 0 0 8px; font-size: 1.8rem; }
    .subtitle { color: #666; margin-bottom: 24px; }
    .last-record {
      display: flex; align-items: center; gap: 12px;
      background: #fff3e0; border-radius: 10px; padding: 14px 16px;
      margin-bottom: 16px; text-align: left;
    }
    .last-record mat-icon { color: #e65100; }
    .label { display: block; font-size: 0.75rem; color: #888; }
    .value { display: block; font-weight: 600; color: #222; }
    .info-box {
      display: flex; align-items: flex-start; gap: 10px;
      background: #e3f2fd; border-radius: 10px;
      padding: 14px 16px; margin-bottom: 16px; text-align: left;
    }
    .info-box mat-icon { color: #1565c0; margin-top: 2px; flex-shrink: 0; }
    .info-box p { margin: 0; color: #1a237e; font-size: 0.9rem; line-height: 1.5; }
    .user-info {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      color: #555; margin-bottom: 24px;
    }
    .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  `]
})
export class AlreadyCheckedInComponent implements OnInit {

  lastRecord: string | null = null;
  userName: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const sesion = this.authService.obtenerSesion();
    if (sesion) {
      this.userName   = sesion.nombre;
      this.lastRecord = sesion.lastRecord ?? null;
    }

    // También recuperar datos pasados por navegación
    const state = history.state as any;
    if (state?.lastRecord) this.lastRecord = state.lastRecord;
  }

  registrarSalida(): void {
    this.router.navigate(['/employee/check-in'], {
      state: { forzarSalida: true }
    });
  }

  irAlDashboard(): void {
    this.router.navigate(['/employee/dashboard']);
  }
}
