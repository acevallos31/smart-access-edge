import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
<div class="landing-wrapper">
  <header class="nav">
    <div class="brand">
      <mat-icon class="brand-icon">fingerprint</mat-icon>
      <span>Smart Access Edge</span>
    </div>
    <div class="nav-actions">
      <button mat-stroked-button class="btn-login" (click)="irLogin()">Iniciar sesión</button>
      <button mat-raised-button color="primary" (click)="irRegister()">Registrarse</button>
    </div>
  </header>

  <section class="hero">
    <div class="hero-content">
      <div class="badge">Sistema de Control de Asistencia</div>
      <h1>Registro de asistencia<br><span class="accent">inteligente y seguro</span></h1>
      <p>Smart Access Edge digitaliza el control de asistencia mediante reconocimiento facial,
         eliminando métodos manuales y garantizando trazabilidad completa.</p>
      <div class="hero-btns">
        <button mat-raised-button color="primary" class="btn-hero" (click)="irLogin()">
          <mat-icon>login</mat-icon> Comenzar ahora
        </button>
        <button mat-stroked-button class="btn-hero-out" (click)="irRegister()">
          <mat-icon>person_add</mat-icon> Crear cuenta
        </button>
      </div>
    </div>
    <div class="hero-visual">
      <div class="card-preview">
        <mat-icon class="big-icon">face</mat-icon>
        <p>Reconocimiento facial</p>
        <p class="sub">en tiempo real</p>
      </div>
    </div>
  </section>

  <section class="features">
    <div class="feature" *ngFor="let f of features">
      <mat-icon>{{ f.icon }}</mat-icon>
      <h3>{{ f.titulo }}</h3>
      <p>{{ f.desc }}</p>
    </div>
  </section>

  <footer class="footer">
    <p>© 2026 Smart Access Edge · Programación IV-Web (CCC205)</p>
  </footer>
</div>
  `,
  styles: [`
    .landing-wrapper { min-height: 100vh; display: flex; flex-direction: column; background: #0f172a; color: #f1f5f9; font-family: 'Segoe UI', sans-serif; }
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 1px solid rgba(255,255,255,.1); }
    .brand { display: flex; align-items: center; gap:.5rem; font-size:1.3rem; font-weight:700; color:#6ee7b7; }
    .brand-icon { font-size:2rem; }
    .nav-actions { display: flex; gap:.75rem; }
    .btn-login { color:#94a3b8; border-color:rgba(255,255,255,.2); }
    .hero { display: flex; align-items: center; justify-content: space-between; padding: 5rem 2rem; max-width:1200px; margin:0 auto; width:100%; gap:2rem; flex-wrap:wrap; }
    .hero-content { flex:1; min-width:280px; }
    .badge { display:inline-block; background:rgba(110,231,183,.15); color:#6ee7b7; border:1px solid rgba(110,231,183,.3); border-radius:999px; padding:.25rem 1rem; font-size:.8rem; margin-bottom:1.5rem; }
    h1 { font-size:clamp(2rem,5vw,3.5rem); font-weight:800; margin:0 0 1.5rem; line-height:1.1; }
    .accent { color:#6ee7b7; }
    p { color:#94a3b8; line-height:1.7; max-width:480px; }
    .hero-btns { display:flex; gap:1rem; margin-top:2rem; flex-wrap:wrap; }
    .btn-hero { font-size:1rem; padding:.75rem 1.5rem; }
    .btn-hero-out { font-size:1rem; padding:.75rem 1.5rem; color:#6ee7b7; border-color:#6ee7b7; }
    .hero-visual { display:flex; align-items:center; justify-content:center; flex:1; min-width:220px; }
    .card-preview { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:1.5rem; padding:3rem 4rem; text-align:center; backdrop-filter:blur(12px); }
    .big-icon { font-size:5rem; color:#6ee7b7; }
    .card-preview p { margin:.5rem 0; color:#e2e8f0; }
    .card-preview .sub { color:#94a3b8; font-size:.85rem; }
    .features { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1.5rem; padding:2rem 2rem 4rem; max-width:1200px; margin:0 auto; width:100%; }
    .feature { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:1rem; padding:1.5rem; }
    .feature mat-icon { color:#6ee7b7; font-size:2rem; margin-bottom:.75rem; }
    .feature h3 { margin:0 0 .5rem; font-size:1rem; }
    .feature p { margin:0; font-size:.88rem; color:#94a3b8; }
    .footer { text-align:center; padding:1.5rem; border-top:1px solid rgba(255,255,255,.08); color:#64748b; font-size:.85rem; }
  `]
})
export class LandingComponent {

  features = [
    { icon: 'face',          titulo: 'Reconocimiento Facial', desc: 'Verifica identidad desde el navegador con face-api.js sin hardware adicional.' },
    { icon: 'schedule',      titulo: 'Control de Turnos',     desc: 'Previene registros duplicados y valida puntualidad según el horario asignado.' },
    { icon: 'bar_chart',     titulo: 'Reportes en Tiempo Real', desc: 'Gráficos de asistencia por departamento, tardanzas y tendencia semanal.' },
    { icon: 'security',      titulo: 'Seguridad y Auditoría', desc: 'Logs inmutables de cada evento con JWT, roles y trazabilidad completa.' },
    { icon: 'group',         titulo: 'Gestión de Empleados',  desc: 'CRUD completo con foto, departamento, cargo y horarios personalizados.' },
    { icon: 'cloud_done',    titulo: 'Firebase & .NET',       desc: 'Backend en ASP.NET Core 10 + Firestore con autenticación Firebase Auth.' },
  ];

  constructor(private router: Router) {}

  irLogin()    { this.router.navigate(['/login']); }
  irRegister() { this.router.navigate(['/register']); }
}
