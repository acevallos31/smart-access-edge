// ============================================================
// EMPLOYEE SERVICE — Solo backend, sin localStorage
// Todos los datos van a Firebase vía el backend .NET
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Employee, RazonInactividad } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class EmployeeService {

  private readonly API = `${environment.apiUrl}/Employee`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.usuarioActual?.token ?? this.auth.usuarioActual?.idToken ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private handleErr(op: string) {
    return (err: any): Observable<never> =>
      throwError(() => new Error(`[${op}] ${err?.error?.message ?? err?.message ?? 'Error de conexión'}`));
  }

  private mapEmployee(raw: any): Employee {
    const horarioEntrada = raw?.horarioEntrada ?? raw?.HorarioEntrada ?? raw?.horario?.entrada ?? raw?.Horario?.Entrada ?? '08:00';
    const horarioSalida = raw?.horarioSalida ?? raw?.HorarioSalida ?? raw?.horario?.salida ?? raw?.Horario?.Salida ?? '17:00';

    return {
      id: raw?.id,
      nombre: raw?.nombre ?? raw?.Nombre ?? '',
      departamento: raw?.departamento ?? raw?.Departamento ?? 'General',
      cargo: raw?.cargo ?? raw?.Cargo ?? '',
      rol: raw?.rol ?? raw?.Rol ?? 'Empleado',
      email: raw?.email ?? raw?.Email,
      password: raw?.password ?? raw?.Password,
      horarioEntrada,
      horarioSalida,
      horario: {
        entrada: horarioEntrada,
        salida: horarioSalida
      },
      fotoUrl: raw?.fotoUrl ?? raw?.FotoUrl ?? raw?.fotoReferenciaUrl ?? raw?.FotoReferenciaUrl,
      activo: raw?.activo ?? raw?.Activo ?? true,
      razonInactividad: raw?.razonInactividad ?? raw?.RazonInactividad,
      notaInactividad: raw?.notaInactividad ?? raw?.NotaInactividad,
      createdAt: raw?.createdAt ?? raw?.CreatedAt,
      createdBy: raw?.createdBy ?? raw?.CreatedBy
    };
  }

  private toApiPayload(emp: Partial<Employee>): any {
    const horarioEntrada = emp.horarioEntrada ?? emp.horario?.entrada;
    const horarioSalida = emp.horarioSalida ?? emp.horario?.salida;

    return {
      nombre: emp.nombre,
      departamento: emp.departamento,
      cargo: emp.cargo,
      rol: emp.rol,
      email: emp.email,
      password: emp.password,
      horarioEntrada,
      horarioSalida,
      horarioAsignado: horarioEntrada && horarioSalida ? `${horarioEntrada}-${horarioSalida}` : '',
      fotoUrl: emp.fotoUrl,
      fotoReferenciaUrl: emp.fotoUrl,
      activo: emp.activo
    };
  }

  getAll(soloActivos?: boolean): Observable<Employee[]> {
    const p = soloActivos !== undefined ? `?soloActivos=${soloActivos}` : '';
    return this.http.get<any[]>(`${this.API}${p}`, { headers: this.headers() })
      .pipe(
        map(rows => (rows ?? []).map(r => this.mapEmployee(r))),
        catchError(this.handleErr('getAll'))
      );
  }

  getById(id: string): Observable<Employee> {
    return this.http.get<any>(`${this.API}/${id}`, { headers: this.headers() })
      .pipe(
        map(raw => this.mapEmployee(raw)),
        catchError(this.handleErr('getById'))
      );
  }

  create(emp: Employee): Observable<Employee> {
    return this.http.post<any>(this.API, this.toApiPayload(emp), { headers: this.headers() })
      .pipe(
        map((raw: any) => this.mapEmployee(raw?.data ?? raw)),
        catchError(this.handleErr('create'))
      );
  }

  update(id: string, emp: Partial<Employee>): Observable<Employee> {
    return this.http.put<any>(`${this.API}/${id}`, this.toApiPayload(emp), { headers: this.headers() })
      .pipe(
        map((raw: any) => this.mapEmployee(raw?.data ?? { ...emp, id })),
        catchError(this.handleErr('update'))
      );
  }

  deactivate(id: string, razon: RazonInactividad = 'despedido', nota?: string): Observable<any> {
    return this.http.patch<any>(`${this.API}/${id}/deactivate`, { razon, nota }, { headers: this.headers() })
      .pipe(catchError(this.handleErr('deactivate')));
  }

  activate(id: string): Observable<any> {
    return this.http.patch<any>(`${this.API}/${id}/activate`, {}, { headers: this.headers() })
      .pipe(catchError(this.handleErr('activate')));
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API}/${id}`, { headers: this.headers() })
      .pipe(catchError(this.handleErr('delete')));
  }
}
