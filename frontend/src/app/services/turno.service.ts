// ============================================================
// TURNO SERVICE — Solo backend, sin fallback local
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface HorarioDia {
  entrada: string;
  salida:  string;
  trabaja: boolean;
}

export interface Turno {
  id?:          string;
  nombre:       string;
  descripcion?: string;
  activo:       boolean;
  lunes?:     HorarioDia;
  martes?:    HorarioDia;
  miercoles?: HorarioDia;
  jueves?:    HorarioDia;
  viernes?:   HorarioDia;
  sabado?:    HorarioDia;
  domingo?:   HorarioDia;
  createdAt?: string;
  createdBy?: string;
}

const DIAS = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'] as const;

@Injectable({ providedIn: 'root' })
export class TurnoService {

  private readonly API = `${environment.apiUrl}/turnos`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.usuarioActual?.idToken ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private error(op: string) {
    return catchError((err: any) => throwError(() =>
      new Error(`[${op}] ${err?.error?.message ?? 'Error de conexión'}`)
    ));
  }

  getAll(soloActivos?: boolean): Observable<Turno[]> {
    const p = soloActivos !== undefined ? `?soloActivos=${soloActivos}` : '';
    return this.http.get<Turno[]>(`${this.API}${p}`, { headers: this.headers() })
      .pipe(this.error('getAll'));
  }

  getById(id: string): Observable<Turno> {
    return this.http.get<Turno>(`${this.API}/${id}`, { headers: this.headers() })
      .pipe(this.error('getById'));
  }

  create(turno: Omit<Turno, 'id'>): Observable<Turno> {
    return this.http.post<Turno>(this.API, turno, { headers: this.headers() })
      .pipe(this.error('create'));
  }

  update(id: string, turno: Partial<Turno>): Observable<Turno> {
    return this.http.put<Turno>(`${this.API}/${id}`, turno, { headers: this.headers() })
      .pipe(this.error('update'));
  }

  activate(id: string): Observable<any> {
    return this.http.patch(`${this.API}/${id}/activate`, {}, { headers: this.headers() })
      .pipe(this.error('activate'));
  }

  deactivate(id: string): Observable<any> {
    return this.http.patch(`${this.API}/${id}/deactivate`, {}, { headers: this.headers() })
      .pipe(this.error('deactivate'));
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.API}/${id}`, { headers: this.headers() })
      .pipe(this.error('delete'));
  }

  getHorarioHoy(turno: Turno): HorarioDia | null {
    const dia = DIAS[new Date().getDay()] as keyof Turno;
    const h = turno[dia] as HorarioDia | undefined;
    return h?.trabaja ? h : null;
  }
}
