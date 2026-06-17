// ============================================================
// CHECK-IN COMPONENT — Escaneo facial automático
// ============================================================
import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { AttendanceService } from '../../../services/attendance.service';
import { FaceService } from '../../../services/face.service';
import { LocationService, Ubicacion } from '../../../services/location.service';
import { SettingsService } from '../../../services/settings.service';

interface Confirmacion {
  tipo:      'entrada' | 'salida';
  nombre:    string;
  rol:       string;
  fecha:     Date;
  fotoUrl?:  string;
  status?:   string;
  ubicacion?: Ubicacion;
}

type Paso = 'inicio' | 'dialogo' | 'escaneando' | 'registrando' | 'confirmacion' | 'duplicado';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule,
    MatButtonModule, MatProgressSpinnerModule
  ],
  templateUrl: './check-in.component.html',
  styleUrls: ['./check-in.component.css']
})
export class CheckInComponent implements OnInit, OnDestroy {

  @ViewChild('videoRef')  videoRef!:  ElementRef<HTMLVideoElement>;
  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;

  paso: Paso = 'inicio';
  dialogoTipo: 'entrada' | 'salida' | null = null;
  confirmacion: Confirmacion | null = null;
  errorRegistro = '';
  errorCamara   = '';

  nombreUsuario = 'Usuario';
  rolUsuario    = 'Empleado';

  // Cámara
  stream:       MediaStream | null = null;
  camaraActiva  = false;

  // Escaneo
  escaneando       = false;
  progresoEscaneo  = 0;       // 0-100
  faceDetectada    = false;
  mensajeEscaneo   = 'Coloca tu rostro dentro del cuadro';
  private scanTimer: any;
  private scanInterval: any;

  yaRegistrado = false;

  readonly MESES = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  readonly DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

  constructor(
    private auth:     AuthService,
    private attendance: AttendanceService,
    private faceService: FaceService,
    private settingsService: SettingsService,
    private locationSvc: LocationService,
    private router:   Router,
    private zone:     NgZone
  ) {}

  ngOnInit() {
    const usuario = this.auth.usuarioActual;
    if (usuario) {
      this.nombreUsuario = usuario.nombre;
      this.rolUsuario    = usuario.rol;
      this.attendance.checkDuplicado(usuario.uid).subscribe(dup => {
        this.yaRegistrado = dup;
        if (dup) this.paso = 'duplicado';
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy() { this.limpiarEscaneo(); this.detenerCamara(); }

  // ── Visibilidad ───────────────────────────────────────────────
  get dialogoVisible()      { return this.paso === 'dialogo'; }
  get escaneandoVisible()   { return this.paso === 'escaneando'; }
  get registrando()         { return this.paso === 'registrando'; }
  get confirmacionVisible() { return this.paso === 'confirmacion'; }
  get inicioVisible()       { return this.paso === 'inicio'; }
  get duplicadoVisible()    { return this.paso === 'duplicado'; }

  // ── PASO 1: Seleccionar acción ────────────────────────────────
  pedirConfirmacion(tipo: 'entrada' | 'salida') {
    if (this.yaRegistrado && tipo === 'entrada') { this.paso = 'duplicado'; return; }
    this.errorRegistro = '';
    this.dialogoTipo   = tipo;
    this.paso = 'dialogo';
  }

  cancelarDialogo() { this.paso = 'inicio'; this.dialogoTipo = null; }

  // ── PASO 2: Abrir cámara y escanear cara ─────────────────────
  async aceptarDialogo() {
    if (!this.dialogoTipo) return;
    this.errorCamara      = '';
    this.progresoEscaneo  = 0;
    this.faceDetectada    = false;
    this.mensajeEscaneo   = 'Coloca tu rostro dentro del cuadro';
    this.paso = 'escaneando';
    await this.faceService.loadModels();
    setTimeout(() => this.iniciarCamara(), 150);
  }

  async iniciarCamara() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        await video.play();
        this.camaraActiva = true;
        this.iniciarEscaneoAutomatico();
      }
    } catch {
      this.errorCamara = 'No se pudo acceder a la cámara. Verifica los permisos.';
      this.camaraActiva = false;
    }
  }

  // ── Escaneo automático ────────────────────────────────────────
  private iniciarEscaneoAutomatico() {
    let intentos = 0;
    const MAX_INTENTOS = 30; // ~3 segundos de escaneo

    this.scanInterval = setInterval(async () => {
      if (!this.camaraActiva || this.paso !== 'escaneando') {
        this.limpiarEscaneo(); return;
      }
      const video  = this.videoRef?.nativeElement;
      const canvas = this.canvasRef?.nativeElement;
      if (!video || !canvas) return;

      intentos++;
      this.zone.run(() => {
        this.progresoEscaneo = Math.min(Math.round((intentos / MAX_INTENTOS) * 100), 99);
      });

      const result = await this.faceService.scanFace(video, canvas);

      if (result.detected && result.confidence > 70) {
        this.zone.run(() => {
          this.faceDetectada  = true;
          this.progresoEscaneo = 100;
          this.mensajeEscaneo  = `✅ Rostro identificado (${result.confidence}%)`;
        });
        this.limpiarEscaneo();

        // Pequeña pausa para que el usuario vea el mensaje
        setTimeout(() => this.finalizarEscaneo(result.dataUrl), 800);
        return;
      }

      if (intentos >= MAX_INTENTOS) {
        this.zone.run(() => {
          this.mensajeEscaneo = 'No se detectó el rostro. Intenta de nuevo.';
          this.progresoEscaneo = 0;
          intentos = 0;
        });
      } else {
        const pct = Math.round((intentos / MAX_INTENTOS) * 100);
        if (pct > 30) {
          this.zone.run(() => this.mensajeEscaneo = 'Escaneando... mantén el rostro estable');
        }
      }
    }, 150);
  }

  private limpiarEscaneo() {
    clearInterval(this.scanInterval);
    clearTimeout(this.scanTimer);
  }

  private finalizarEscaneo(fotoBase64: string | null) {
    this.detenerCamara();
    const tipo = this.dialogoTipo!;
    this.paso = 'registrando';

    // Obtener ubicación y registrar en paralelo
    this.locationSvc.obtenerUbicacion().subscribe(ubicacion => {
      const usaVerificacion = !!fotoBase64 && this.settingsService.tpuHabilitado;
      const modoEstricto = this.settingsService.strictFaceVerification;
      const registro$ = usaVerificacion
        ? this.auth.registrarAsistenciaConVerificacion(tipo, fotoBase64, ubicacion, modoEstricto)
        : this.auth.registrarAsistencia(tipo, fotoBase64 ?? undefined, ubicacion);

      registro$.subscribe({
        next: (res) => {
          if (res.exito) {
            this.zone.run(() => {
              this.yaRegistrado  = tipo === 'entrada';
              this.confirmacion  = {
                tipo,
                nombre:    this.nombreUsuario,
                rol:       this.rolUsuario,
                fecha:     new Date(),
                fotoUrl:   fotoBase64 ?? undefined,
                status:    res.status,
                ubicacion
              };
              this.dialogoTipo = null;
              this.paso = 'confirmacion';
            });
          } else {
            // Fallback opcional: si falla la verificación, registrar sin TPU
            if (usaVerificacion && !modoEstricto) {
              this.auth.registrarAsistencia(tipo, fotoBase64 ?? undefined, ubicacion).subscribe({
                next: (fallbackRes) => {
                  if (fallbackRes.exito) {
                    this.zone.run(() => {
                      this.yaRegistrado  = tipo === 'entrada';
                      this.confirmacion  = {
                        tipo,
                        nombre: this.nombreUsuario,
                        rol: this.rolUsuario,
                        fecha: new Date(),
                        fotoUrl: fotoBase64 ?? undefined,
                        status: fallbackRes.status,
                        ubicacion
                      };
                      this.dialogoTipo = null;
                      this.paso = 'confirmacion';
                    });
                    return;
                  }

                  this.zone.run(() => {
                    this.errorRegistro = res.mensaje ?? fallbackRes.mensaje ?? 'No se pudo registrar. Intenta de nuevo.';
                    this.paso = 'dialogo';
                  });
                },
                error: () => {
                  this.zone.run(() => {
                    this.errorRegistro = res.mensaje ?? 'No se pudo registrar. Intenta de nuevo.';
                    this.paso = 'dialogo';
                  });
                }
              });
              return;
            }

            this.zone.run(() => {
              this.errorRegistro = res.mensaje ?? 'No se pudo registrar. Intenta de nuevo.';
              this.paso = 'dialogo';
            });
          }
        },
        error: () => {
          this.zone.run(() => {
            this.errorRegistro = 'Error de conexión. Verifica tu red.';
            this.paso = 'dialogo';
          });
        }
      });
    });
  }

  detenerCamara() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.camaraActiva = false;
  }

  cancelarEscaneo() {
    this.limpiarEscaneo();
    this.detenerCamara();
    this.paso = 'dialogo';
  }

  // ── Getters de fecha/hora ─────────────────────────────────────
  get horaFormateada(): string {
    if (!this.confirmacion) return '';
    const f = this.confirmacion.fecha;
    return [f.getHours(), f.getMinutes(), f.getSeconds()].map(n => n.toString().padStart(2,'0')).join(':');
  }

  get periodoDelDia(): string {
    return !this.confirmacion ? '' : this.confirmacion.fecha.getHours() < 12 ? 'a.m.' : 'p.m.';
  }

  get fechaCompleta(): string {
    if (!this.confirmacion) return '';
    const f = this.confirmacion.fecha;
    return `${this.DIAS[f.getDay()]} ${f.getDate()} de ${this.MESES[f.getMonth()]} de ${f.getFullYear()}`;
  }

  estadoClass(status?: string): string {
    const value = (status ?? '').toLowerCase();
    if (value === 'puntual') return 'status-puntual';
    if (value === 'tardanza') return 'status-tardanza';
    if (value === 'extra') return 'status-extra';
    if (value === 'fuera de horario') return 'status-fuera-horario';
    return 'status-ausente';
  }

  estadoLabel(status?: string): string {
    const value = (status ?? '').toLowerCase();
    if (value === 'puntual') return '✓ Puntual';
    if (value === 'tardanza') return '⚠ Tardanza';
    if (value === 'extra') return '⏱ Extra';
    if (value === 'fuera de horario') return '🚫 Fuera de horario';
    if (value === 'ausente') return '❌ Ausente';
    return status ?? 'Sin estado';
  }

  volverAlInicio() {
    this.confirmacion = null;
    this.errorRegistro = '';
    this.paso = 'inicio';
  }

  irDashboard()  { this.router.navigate(['/employee/dashboard']); }
  cerrarSesion() { this.limpiarEscaneo(); this.detenerCamara(); this.auth.logout(); }
}
