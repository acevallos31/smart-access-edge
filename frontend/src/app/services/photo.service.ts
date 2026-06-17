import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PhotoService {

  private readonly API = `${environment.apiUrl}/photos`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.usuarioActual?.token ?? this.auth.usuarioActual?.idToken ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Captura foto de la cámara y devuelve en base64
   */
  async capturaFotoDeCamera(videoElement: HTMLVideoElement): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg').split(',')[1];  // Sin prefijo "data:image/jpeg;base64,"
  }

  /**
   * Sube foto del empleado a Firebase Storage
   */
  subirFotoEmpleado(userId: string, base64Photo: string, contentType = 'image/jpeg'): Observable<any> {
    return this.http.post<any>(
      `${this.API}/upload`,
      { userId, base64Photo, contentType },
      { headers: this.headers() }
    ).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? 'Error subiendo foto')
      ))
    );
  }

  /**
   * Obtiene URL de la foto del empleado
   */
  obtenerFotoEmpleado(userId: string): Observable<{ fotoUrl: string }> {
    return this.http.get<{ fotoUrl: string }>(
      `${this.API}/${userId}`,
      { headers: this.headers() }
    ).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? 'Error obteniendo foto')
      ))
    );
  }

  /**
   * Elimina foto del empleado
   */
  eliminarFotoEmpleado(userId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.API}/${userId}`,
      { headers: this.headers() }
    ).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.message ?? 'Error eliminando foto')
      ))
    );
  }
}
