import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FirebaseAuthService } from '../services/firebase-auth.service';

interface RegistroConfirmacion {
  tipo: 'entrada' | 'salida';
  nombre: string;
  rol: string;
  fecha: Date;
  fotoUrl?: string;
}

type Paso = 'inicio' | 'dialogo' | 'camara' | 'registrando' | 'confirmacion';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './check-in.component.html',
  styleUrls: ['./check-in.component.css']
})
export class CheckInComponent implements OnInit, OnDestroy {

  @ViewChild('videoRef') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;

  paso: Paso = 'inicio';
  dialogoTipo: 'entrada' | 'salida' | null = null;
  confirmacion: RegistroConfirmacion | null = null;
  errorRegistro: string = '';

  nombreUsuario: string = 'Usuario';
  rolUsuario: string = 'Empleado';

  // Cámara
  stream: MediaStream | null = null;
  fotoCapturada: string | null = null;
  errorCamara: string = '';
  camaraActiva: boolean = false;

  readonly MESES: string[] = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  readonly DIAS: string[] = [
    'domingo', 'lunes', 'martes', 'miércoles',
    'jueves', 'viernes', 'sábado'
  ];

  constructor(
    private authService: FirebaseAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.usuarioActual;
    if (usuario) {
      this.nombreUsuario = usuario.nombre;
      this.rolUsuario    = usuario.rol;
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }

  // ──────────────────────────────────────────────
  // Helpers de visibilidad
  // ──────────────────────────────────────────────
  get dialogoVisible()     { return this.paso === 'dialogo'; }
  get camaraVisible()      { return this.paso === 'camara'; }
  get registrando()        { return this.paso === 'registrando'; }
  get confirmacionVisible(){ return this.paso === 'confirmacion'; }
  get inicioVisible()      { return this.paso === 'inicio'; }

  // ──────────────────────────────────────────────
  // Paso 1: Pide confirmación → abre diálogo
  // ──────────────────────────────────────────────
  pedirConfirmacion(tipo: 'entrada' | 'salida') {
    this.errorRegistro = '';
    this.dialogoTipo   = tipo;
    this.paso = 'dialogo';
  }

  cancelarDialogo() {
    this.paso = 'inicio';
    this.dialogoTipo = null;
  }

  // ──────────────────────────────────────────────
  // Paso 2: Aceptar diálogo → abre cámara
  // ──────────────────────────────────────────────
  aceptarDialogo() {
    if (!this.dialogoTipo) return;
    this.fotoCapturada = null;
    this.errorCamara   = '';
    this.paso = 'camara';
    // Espera un tick para que el DOM renderice el <video>
    setTimeout(() => this.iniciarCamara(), 100);
  }

  // ──────────────────────────────────────────────
  // Cámara
  // ──────────────────────────────────────────────
  async iniciarCamara() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        video.play();
        this.camaraActiva = true;
      }
    } catch (err) {
      this.errorCamara = 'No se pudo acceder a la cámara. Verifica los permisos del navegador.';
      this.camaraActiva = false;
    }
  }

  detenerCamara() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.camaraActiva = false;
  }

  tomarFoto() {
    const video  = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.fotoCapturada = canvas.toDataURL('image/jpeg', 0.85);
    }
  }

  repetirFoto() {
    this.fotoCapturada = null;
  }

  cancelarCamara() {
    this.detenerCamara();
    this.fotoCapturada = null;
    this.paso = 'dialogo';
  }

  // ──────────────────────────────────────────────
  // Paso 3: Confirmar foto → registrar asistencia
  // ──────────────────────────────────────────────
  confirmarFotoYRegistrar() {
    if (!this.dialogoTipo) return;
    this.detenerCamara();

    const tipo = this.dialogoTipo;
    const foto = this.fotoCapturada;
    this.paso = 'registrando';

    this.authService.registrarAsistencia(tipo).subscribe({
      next: (exito: boolean) => {
        if (exito) {
          this.confirmacion = {
            tipo,
            nombre: this.nombreUsuario,
            rol:    this.rolUsuario,
            fecha:  new Date(),
            fotoUrl: foto ?? undefined
          };
          this.dialogoTipo = null;
          this.paso = 'confirmacion';
        } else {
          this.errorRegistro = 'No se pudo registrar. Intenta de nuevo.';
          this.paso = 'dialogo';
        }
      },
      error: () => {
        this.errorRegistro = 'Error de conexión. Verifica tu red e intenta de nuevo.';
        this.paso = 'dialogo';
      }
    });
  }

  // ──────────────────────────────────────────────
  // Getters de fecha/hora para pantalla final
  // ──────────────────────────────────────────────
  get horaFormateada(): string {
    if (!this.confirmacion) return '';
    const f = this.confirmacion.fecha;
    return [
      f.getHours().toString().padStart(2, '0'),
      f.getMinutes().toString().padStart(2, '0'),
      f.getSeconds().toString().padStart(2, '0')
    ].join(':');
  }

  get periodoDelDia(): string {
    if (!this.confirmacion) return '';
    return this.confirmacion.fecha.getHours() < 12 ? 'a.m.' : 'p.m.';
  }

  get fechaCompleta(): string {
    if (!this.confirmacion) return '';
    const f = this.confirmacion.fecha;
    return `${this.DIAS[f.getDay()]} ${f.getDate()} de ${this.MESES[f.getMonth()]} de ${f.getFullYear()}`;
  }

  volverAlInicio() {
    this.confirmacion  = null;
    this.fotoCapturada = null;
    this.errorRegistro = '';
    this.paso = 'inicio';
  }

  cerrarSesion() {
    this.detenerCamara();
    this.authService.logout();
  }
}
