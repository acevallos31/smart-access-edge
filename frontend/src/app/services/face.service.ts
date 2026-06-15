// ============================================================
// FACE SERVICE — Reconocimiento Facial con face-api.js
// ============================================================
// MODO DEMO: funciona sin face-api.js (simula el escaneo)
// MODO REAL: sigue los pasos del README_FACE.md para activar
// ============================================================
import { Injectable } from '@angular/core';

export interface FaceResult {
  detected: boolean;
  confidence: number;   // 0-100
  dataUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class FaceService {

  private modelsLoaded = false;
  private faceapi: any = null;

  // ── Cargar modelos (llamar al iniciar la app o el componente) ──
  async loadModels(): Promise<void> {
    // MODO DEMO
    this.modelsLoaded = true;
    return;

    /* ── MODO REAL (descomentar tras instalar face-api.js) ────────
    this.faceapi = (window as any).faceapi;
    if (!this.faceapi) throw new Error('face-api.js no encontrado');
    const MODEL_URL = '/assets/face-api-models';
    await Promise.all([
      this.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      this.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      this.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    this.modelsLoaded = true;
    ──────────────────────────────────────────────────────────── */
  }

  // ── Detectar y capturar cara desde video en tiempo real ──────
  async scanFace(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): Promise<FaceResult> {

    if (!this.modelsLoaded) await this.loadModels();

    // ── MODO DEMO ─────────────────────────────────────────────
    // Simula una detección exitosa después de verificar que
    // el video está activo y tiene dimensiones válidas
    if (video.videoWidth === 0 || video.readyState < 2) {
      return { detected: false, confidence: 0, dataUrl: null };
    }

    // Captura el frame actual
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // En demo, simula confianza alta
    return { detected: true, confidence: 97, dataUrl };
    // ── FIN MODO DEMO ─────────────────────────────────────────

    /* ── MODO REAL ───────────────────────────────────────────────
    const options = new this.faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5
    });
    const detection = await this.faceapi
      .detectSingleFace(video, options)
      .withFaceLandmarks();

    if (!detection) return { detected: false, confidence: 0, dataUrl: null };

    const confidence = Math.round(detection.detection.score * 100);

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    return { detected: true, confidence, dataUrl };
    ──────────────────────────────────────────────────────────── */
  }

  // ── Registrar foto de referencia del empleado ─────────────────
  // (Se llama al registrar cuenta por primera vez)
  async capturarFotoRegistro(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): Promise<string | null> {
    const result = await this.scanFace(video, canvas);
    return result.detected ? result.dataUrl : null;
  }

  // ── Verificar cara contra foto registrada ─────────────────────
  // (Para el MODO REAL con descriptores)
  async verificarIdentidad(
    video: HTMLVideoElement,
    fotoReferenciaUrl: string
  ): Promise<boolean> {
    // MODO DEMO: siempre verifica
    return true;

    /* ── MODO REAL ───────────────────────────────────────────────
    // Cargar descriptor de la foto de referencia
    const img = await this.faceapi.fetchImage(fotoReferenciaUrl);
    const refDesc = await this.faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!refDesc) return false;

    // Detectar cara en el video en vivo
    const liveDesc = await this.faceapi
      .detectSingleFace(video, new this.faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!liveDesc) return false;

    const distance = this.faceapi.euclideanDistance(
      refDesc.descriptor, liveDesc.descriptor
    );
    return distance < 0.6; // umbral: cuanto menor, más parecido
    ──────────────────────────────────────────────────────────── */
  }

  dataUrlToBlob(dataUrl: string): Blob {
    const arr  = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }
}
