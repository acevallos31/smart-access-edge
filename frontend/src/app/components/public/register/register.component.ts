// ============================================================
// REGISTRO DE CUENTA — Con foto de rostro (primer uso)
// ============================================================
import {
  Component, ViewChild, ElementRef, OnDestroy, NgZone
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { FaceService } from '../../../services/face.service';
import { StorageService } from '../../../services/storage.service';

type Paso = 'datos' | 'foto' | 'escaneando' | 'registrando';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatInputModule, MatFormFieldModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
<div class="reg-wrapper">
  <div class="reg-card">

    <!-- Header -->
    <div class="reg-header">
      <span class="reg-header-icon">{{ paso === 'foto' || paso === 'escaneando' ? '📷' : '👤' }}</span>
      <div>
        <h2>{{ paso === 'foto' || paso === 'escaneando' ? 'Registrar Rostro' : 'Crear Cuenta' }}</h2>
        <p>Smart Access Edge</p>
      </div>
    </div>

    <!-- ══ PASO 1: DATOS ════════════════════════════════════════ -->
    <div *ngIf="paso === 'datos'" class="reg-body">

      <div class="stepper">
        <div class="step active"><span>1</span><small>Datos</small></div>
        <div class="step-line"></div>
        <div class="step"><span>2</span><small>Rostro</small></div>
      </div>

      <mat-form-field appearance="outline" class="fw">
        <mat-label>Nombre completo</mat-label>
        <input matInput [(ngModel)]="nombre" placeholder="Tu nombre" [disabled]="cargando">
        <mat-icon matSuffix>person</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="fw">
        <mat-label>Correo electrónico</mat-label>
        <input matInput type="email" [(ngModel)]="email" placeholder="tu@empresa.com" [disabled]="cargando">
        <mat-icon matSuffix>email</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="fw">
        <mat-label>Contraseña</mat-label>
        <input matInput [type]="verPwd ? 'text' : 'password'" [(ngModel)]="password" [disabled]="cargando">
        <mat-icon matSuffix style="cursor:pointer" (click)="verPwd=!verPwd">
          {{ verPwd ? 'visibility_off' : 'visibility' }}
        </mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="fw">
        <mat-label>Confirmar contraseña</mat-label>
        <input matInput [type]="verPwd ? 'text' : 'password'" [(ngModel)]="confirmPwd" [disabled]="cargando">
        <mat-icon matSuffix>lock_reset</mat-icon>
      </mat-form-field>

      <div *ngIf="errorMsg" class="error-box">⚠️ {{ errorMsg }}</div>

      <button class="btn-primary fw-btn" (click)="irAFoto()" [disabled]="cargando">
        Siguiente: Registrar Rostro →
      </button>

      <button class="link-btn" (click)="irLogin()">¿Ya tienes cuenta? Inicia sesión</button>
    </div>

    <!-- ══ PASO 2: INSTRUCCIÓN FOTO ════════════════════════════ -->
    <div *ngIf="paso === 'foto'" class="reg-body center">

      <div class="stepper">
        <div class="step done"><span>✓</span><small>Datos</small></div>
        <div class="step-line step-line-done"></div>
        <div class="step active"><span>2</span><small>Rostro</small></div>
      </div>

      <div class="face-ilustracion">🧑</div>
      <h3 class="step-title">Registra tu rostro</h3>
      <p class="step-desc">
        Para que el sistema pueda reconocerte al registrar asistencia,
        necesitamos capturar una foto de tu rostro.
      </p>
      <ul class="face-tips">
        <li>📍 Posiciona tu cara en el centro</li>
        <li>💡 Asegúrate de tener buena iluminación</li>
        <li>🚫 Quita gafas o mascarilla si es posible</li>
        <li>😊 Mira directamente a la cámara</li>
      </ul>

      <div *ngIf="errorCamara" class="error-box">📵 {{ errorCamara }}</div>

      <div class="btn-row">
        <button class="btn-secondary" (click)="paso = 'datos'">← Atrás</button>
        <button class="btn-primary" (click)="iniciarCaptura()">📷 Abrir cámara</button>
      </div>
    </div>

    <!-- ══ PASO 3: CAPTURA / ESCANEO ════════════════════════════ -->
    <div *ngIf="paso === 'escaneando'" class="reg-body center">

      <p class="scan-msg">{{ mensajeScan }}</p>

      <div class="scan-frame" [ngClass]="{'frame-ok': fotoCapturada}">
        <video #videoRef autoplay playsinline muted class="scan-video"></video>
        <canvas #canvasRef style="display:none;"></canvas>
        <span class="corner tl"></span>
        <span class="corner tr"></span>
        <span class="corner bl"></span>
        <span class="corner br"></span>
        <div *ngIf="!fotoCapturada" class="scan-line"></div>
        <div *ngIf="fotoCapturada" class="scan-ok-overlay">✅</div>
      </div>

      <div *ngIf="!fotoCapturada" class="prog-wrap">
        <div class="prog-track"><div class="prog-fill" [style.width.%]="progreso"></div></div>
        <span class="prog-pct">{{ progreso }}%</span>
      </div>

      <img *ngIf="fotoCapturada" [src]="fotoCapturada" class="foto-preview" alt="Foto capturada">

      <div *ngIf="errorCamara" class="error-box">📵 {{ errorCamara }}</div>

      <div class="btn-row" *ngIf="!fotoCapturada">
        <button class="btn-secondary" (click)="cancelarCaptura()">← Cancelar</button>
      </div>

      <div class="btn-row" *ngIf="fotoCapturada">
        <button class="btn-secondary" (click)="repetirFoto()">🔄 Repetir</button>
        <button class="btn-primary" (click)="confirmarYRegistrar()">✓ Confirmar y crear cuenta</button>
      </div>
    </div>

    <!-- ══ REGISTRANDO ══════════════════════════════════════════ -->
    <div *ngIf="paso === 'registrando'" class="reg-body center">
      <div class="spinner-ring"></div>
      <p class="load-txt">Creando tu cuenta...</p>
    </div>

  </div>
</div>
  `,
  styles: [`
    .reg-wrapper { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#0f172a,#1e293b); padding:1rem; font-family:'Segoe UI',sans-serif; }
    .reg-card { width:100%; max-width:460px; background:#fff; border-radius:1.5rem; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,.4); }
    .reg-header { background:linear-gradient(135deg,#1b5e20,#2e7d32); padding:1.5rem 2rem; display:flex; align-items:center; gap:1rem; color:#fff; }
    .reg-header-icon { font-size:2.2rem; }
    .reg-header h2 { margin:0; font-size:1.3rem; font-weight:700; }
    .reg-header p  { margin:0; font-size:.82rem; opacity:.85; }
    .reg-body { padding:1.75rem 2rem; display:flex; flex-direction:column; gap:.9rem; }
    .reg-body.center { align-items:center; text-align:center; }
    .fw { width:100% !important; }
    .stepper { display:flex; align-items:center; margin-bottom:.5rem; }
    .step { display:flex; flex-direction:column; align-items:center; gap:.2rem; }
    .step span { width:28px; height:28px; border-radius:50%; background:#e2e8f0; color:#94a3b8; font-weight:700; font-size:.85rem; display:flex; align-items:center; justify-content:center; }
    .step small { font-size:.7rem; color:#94a3b8; }
    .step.active span { background:#2e7d32; color:#fff; }
    .step.done  span { background:#22c55e; color:#fff; }
    .step-line { flex:1; height:2px; background:#e2e8f0; margin:0 .5rem; margin-bottom:1.1rem; }
    .step-line-done { background:#22c55e; }
    .error-box { background:#fef2f2; border:1px solid #fca5a5; color:#991b1b; border-radius:.75rem; padding:.75rem 1rem; font-size:.85rem; width:100%; }
    .btn-primary  { background:#2e7d32; color:#fff; border:none; border-radius:.75rem; padding:.7rem 1.5rem; font-size:.95rem; font-weight:600; cursor:pointer; transition:.2s; }
    .btn-primary:hover  { background:#1b5e20; }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
    .btn-secondary { background:#f1f5f9; color:#475569; border:none; border-radius:.75rem; padding:.7rem 1.5rem; font-size:.95rem; font-weight:600; cursor:pointer; }
    .fw-btn { width:100%; }
    .link-btn { background:none; border:none; color:#2e7d32; font-size:.88rem; cursor:pointer; text-align:center; }
    .btn-row { display:flex; gap:.75rem; }
    .face-ilustracion { font-size:4rem; }
    .step-title { margin:0; font-size:1.1rem; font-weight:700; color:#0f172a; }
    .step-desc  { margin:0; font-size:.88rem; color:#475569; }
    .face-tips  { list-style:none; padding:0; margin:0; text-align:left; background:#f0fdf4; border-radius:.75rem; padding:.75rem 1rem; }
    .face-tips li { font-size:.85rem; color:#166534; margin-bottom:.3rem; }
    .scan-msg { font-size:.95rem; font-weight:600; color:#0f172a; margin:0; min-height:1.4rem; }
    .scan-frame { position:relative; width:260px; height:260px; border-radius:1rem; overflow:hidden; background:#0f172a; border:3px solid #334155; transition:border-color .4s; }
    .frame-ok { border-color:#22c55e !important; }
    .scan-video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
    .corner { position:absolute; width:20px; height:20px; border-color:#4ade80; border-style:solid; }
    .tl { top:6px; left:6px; border-width:3px 0 0 3px; border-radius:4px 0 0 0; }
    .tr { top:6px; right:6px; border-width:3px 3px 0 0; border-radius:0 4px 0 0; }
    .bl { bottom:6px; left:6px; border-width:0 0 3px 3px; border-radius:0 0 0 4px; }
    .br { bottom:6px; right:6px; border-width:0 3px 3px 0; border-radius:0 0 4px 0; }
    .scan-line { position:absolute; left:8%; right:8%; height:2px; background:rgba(74,222,128,.8); animation:scanMove 2s ease-in-out infinite; }
    @keyframes scanMove { 0%{top:10%} 50%{top:85%} 100%{top:10%} }
    .scan-ok-overlay { position:absolute; inset:0; background:rgba(34,197,94,.2); display:flex; align-items:center; justify-content:center; font-size:3.5rem; }
    .prog-wrap  { display:flex; align-items:center; gap:.75rem; width:260px; }
    .prog-track { flex:1; height:8px; background:#e2e8f0; border-radius:999px; overflow:hidden; }
    .prog-fill  { height:100%; background:#4ade80; border-radius:999px; transition:width .2s; }
    .prog-pct   { font-size:.8rem; color:#64748b; font-weight:600; }
    .foto-preview { width:120px; height:120px; border-radius:50%; object-fit:cover; border:4px solid #22c55e; margin:.5rem 0; }
    .spinner-ring { width:52px; height:52px; border:5px solid #e2e8f0; border-top-color:#2e7d32; border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .load-txt { font-size:1rem; font-weight:600; color:#0f172a; margin:0; }
  `]
})
export class RegisterComponent implements OnDestroy {
  @ViewChild('videoRef')  videoRef!:  ElementRef<HTMLVideoElement>;
  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;

  paso: Paso = 'datos';
  nombre = ''; email = ''; password = ''; confirmPwd = '';
  errorMsg = ''; errorCamara = ''; verPwd = false; cargando = false;

  stream:        MediaStream | null = null;
  fotoCapturada: string | null = null;
  progreso = 0;
  mensajeScan = 'Coloca tu rostro en el cuadro';

  private scanInterval: any;

  constructor(
    private auth: AuthService,
    private faceService: FaceService,
    private storage: StorageService,
    private router: Router,
    private zone: NgZone
  ) {}

  ngOnDestroy() { this.detenerCamara(); clearInterval(this.scanInterval); }

  irLogin() { this.router.navigate(['/login']); }

  irAFoto() {
    this.errorMsg = '';
    if (!this.nombre || !this.email || !this.password || !this.confirmPwd) {
      this.errorMsg = 'Por favor completa todos los campos.'; return;
    }
    if (this.password !== this.confirmPwd) {
      this.errorMsg = 'Las contraseñas no coinciden.'; return;
    }
    if (this.password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.'; return;
    }
    this.paso = 'foto';
  }

  async iniciarCaptura() {
    this.errorCamara = '';
    this.fotoCapturada = null;
    this.progreso = 0;
    this.paso = 'escaneando';
    await this.faceService.loadModels();
    setTimeout(() => this.abrirCamara(), 150);
  }

  async abrirCamara() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false
      });
      const v = this.videoRef?.nativeElement;
      if (v) { v.srcObject = this.stream; await v.play(); this.iniciarScan(); }
    } catch {
      this.errorCamara = 'No se pudo acceder a la cámara.';
      this.paso = 'foto';
    }
  }

  private iniciarScan() {
    let intentos = 0;
    const MAX = 25;
    this.scanInterval = setInterval(async () => {
      const v = this.videoRef?.nativeElement;
      const c = this.canvasRef?.nativeElement;
      if (!v || !c) return;
      intentos++;
      this.zone.run(() => this.progreso = Math.min(Math.round((intentos / MAX) * 100), 99));
      const result = await this.faceService.scanFace(v, c);
      if (result.detected && result.confidence > 70) {
        clearInterval(this.scanInterval);
        this.zone.run(() => {
          this.progreso     = 100;
          this.mensajeScan  = '✅ Rostro capturado correctamente';
          this.fotoCapturada = result.dataUrl;
        });
        this.detenerCamara();
      } else if (intentos >= MAX) {
        intentos = 0;
        this.zone.run(() => { this.mensajeScan = 'Ajusta tu posición e intenta de nuevo'; this.progreso = 0; });
      }
    }, 150);
  }

  detenerCamara() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  cancelarCaptura() {
    clearInterval(this.scanInterval);
    this.detenerCamara();
    this.fotoCapturada = null;
    this.paso = 'foto';
  }

  repetirFoto() {
    this.fotoCapturada = null;
    this.progreso = 0;
    this.mensajeScan = 'Coloca tu rostro en el cuadro';
    setTimeout(() => this.abrirCamara(), 100);
  }

  confirmarYRegistrar() {
    if (!this.fotoCapturada) return;
    this.paso = 'registrando';
    this.auth.register(this.email, this.password, this.nombre).subscribe({
      next: () => {
        // Registro exitoso — hacer login automatico
        this.auth.login(this.email, this.password).subscribe({
          next: () => this.router.navigate(['/employee/dashboard']),
          error: () => this.router.navigate(['/login'])
        });
      },
      error: (err: any) => {
        this.paso = 'datos';
        this.errorMsg = err?.message ?? 'Error al crear la cuenta. Intenta de nuevo.';
      }
    });
  }
}
