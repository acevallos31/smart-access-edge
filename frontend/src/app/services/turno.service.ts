// ============================================================
// TURNO SERVICE — Frontend llama al backend /api/turnos
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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

const DIAS_SEM = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'] as const;

@Injectable({ providedIn: 'root' })
export class TurnoService {

  private readonly API = `${environment.apiUrl}/turnos`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.usuarioActual?.token ?? this.auth.usuarioActual?.idToken ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── CRUD ────────────────────────────────────────────────────
  getAll(soloActivos?: boolean): Observable<Turno[]> {
    const params = soloActivos !== undefined ? `?soloActivos=${soloActivos}` : '';
    return this.http.get<Turno[]>(`${this.API}${params}`, { headers: this.headers() })
      .pipe(catchError(() => of(this.turnosDemoFallback())));
  }

  getById(id: string): Observable<Turno | null> {
    return this.http.get<Turno>(`${this.API}/${id}`, { headers: this.headers() })
      .pipe(catchError(() => of(null)));
  }

  create(turno: Omit<Turno, 'id'>): Observable<Turno> {
    return this.http.post<Turno>(this.API, turno, { headers: this.headers() });
  }

  update(id: string, turno: Partial<Turno>): Observable<Turno> {
    return this.http.put<Turno>(`${this.API}/${id}`, turno, { headers: this.headers() });
  }

  activate(id: string): Observable<any> {
    return this.http.patch(`${this.API}/${id}/activate`, {}, { headers: this.headers() });
  }

  deactivate(id: string): Observable<any> {
    return this.http.patch(`${this.API}/${id}/deactivate`, {}, { headers: this.headers() });
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.API}/${id}`, { headers: this.headers() });
  }

  // ── Helper: horario del turno para hoy ─────────────────────
  getHorarioHoy(turno: Turno): HorarioDia | null {
    const diaNom = DIAS_SEM[new Date().getDay()] as keyof Turno;
    const horario = turno[diaNom] as HorarioDia | undefined;
    return horario?.trabaja ? horario : null;
  }

  // ── Fallback demo (cuando no hay backend activo) ─────────────
  private turnosDemoFallback(): Turno[] {
    return [
      {
        id: 'turno-manana', nombre: 'Turno Mañana', activo: true,
        descripcion: 'Horario estándar de mañana',
        lunes:    { entrada: '06:00', salida: '14:00', trabaja: true },
        martes:   { entrada: '06:00', salida: '14:00', trabaja: true },
        miercoles:{ entrada: '06:00', salida: '14:00', trabaja: true },
        jueves:   { entrada: '06:00', salida: '14:00', trabaja: true },
        viernes:  { entrada: '06:00', salida: '14:00', trabaja: true },
        sabado:   { entrada: '06:00', salida: '10:00', trabaja: true },
        domingo:  { entrada: '08:00', salida: '12:00', trabaja: false }
      },
      {
        id: 'turno-tarde', nombre: 'Turno Tarde', activo: true,
        descripcion: 'Horario de tarde',
        lunes:    { entrada: '14:00', salida: '22:00', trabaja: true },
        martes:   { entrada: '14:00', salida: '22:00', trabaja: true },
        miercoles:{ entrada: '14:00', salida: '22:00', trabaja: true },
        jueves:   { entrada: '14:00', salida: '22:00', trabaja: true },
        viernes:  { entrada: '14:00', salida: '22:00', trabaja: true },
        sabado:   { entrada: '14:00', salida: '20:00', trabaja: true },
        domingo:  { entrada: '08:00', salida: '12:00', trabaja: false }
      },
      {
        id: 'turno-oficina', nombre: 'Turno Oficina', activo: true,
        descripcion: 'Horario administrativo estándar',
        lunes:    { entrada: '08:00', salida: '17:00', trabaja: true },
        martes:   { entrada: '08:00', salida: '17:00', trabaja: true },
        miercoles:{ entrada: '08:00', salida: '17:00', trabaja: true },
        jueves:   { entrada: '08:00', salida: '17:00', trabaja: true },
        viernes:  { entrada: '08:00', salida: '16:00', trabaja: true },
        sabado:   { entrada: '08:00', salida: '12:00', trabaja: false },
        domingo:  { entrada: '08:00', salida: '12:00', trabaja: false }
      }
    ];
  }
}
