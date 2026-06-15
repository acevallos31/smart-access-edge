// ============================================================
// EMPLOYEE SERVICE — llama al backend /api/employees
// La lógica de negocio está en el backend (.NET)
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Employee, RazonInactividad } from '../models/models';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class EmployeeService {

  private readonly API = `${environment.apiUrl}/employees`;

  constructor(
    private http:    HttpClient,
    private auth:    AuthService,
    private storage: StorageService
  ) {}

  private headers(): HttpHeaders {
    const token = this.auth.usuarioActual?.idToken ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── GET ALL ────────────────────────────────────────────────
  getAll(soloActivos?: boolean): Observable<Employee[]> {
    const params = soloActivos !== undefined ? `?soloActivos=${soloActivos}` : '';
    return this.http.get<Employee[]>(`${this.API}${params}`, { headers: this.headers() })
      .pipe(catchError(() => of([...this.storage.getEmpleados()])));
  }

  // ── GET BY ID ──────────────────────────────────────────────
  getById(id: string): Observable<Employee | null> {
    return this.http.get<Employee>(`${this.API}/${id}`, { headers: this.headers() })
      .pipe(catchError(() => {
        const emp = this.storage.getEmpleados().find(e => e.id === id) ?? null;
        return of(emp);
      }));
  }

  // ── CREATE ─────────────────────────────────────────────────
  create(emp: Employee): Observable<Employee> {
    return this.http.post<Employee>(this.API, emp, { headers: this.headers() })
      .pipe(catchError(() => {
        const nuevo = { ...emp, id: 'emp-' + Date.now() };
        this.storage.upsertEmpleado(nuevo);
        return of(nuevo);
      }));
  }

  // ── UPDATE ─────────────────────────────────────────────────
  update(id: string, emp: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.API}/${id}`, emp, { headers: this.headers() })
      .pipe(catchError(() => {
        const actual = this.storage.getEmpleados().find(e => e.id === id);
        const actualizado = { ...actual!, ...emp };
        this.storage.upsertEmpleado(actualizado);
        return of(actualizado);
      }));
  }

  // ── DESACTIVAR con razón ───────────────────────────────────
  deactivate(id: string, razon: RazonInactividad = 'despedido', nota?: string): Observable<boolean> {
    return this.http.patch<any>(
      `${this.API}/${id}/deactivate`,
      { razon, nota },
      { headers: this.headers() }
    ).pipe(
      catchError(() => {
        const emp = this.storage.getEmpleados().find(e => e.id === id);
        if (emp) { emp.activo = false; emp.razonInactividad = razon; emp.notaInactividad = nota; this.storage.upsertEmpleado(emp); }
        return of(true);
      })
    );
  }

  // ── ACTIVAR ────────────────────────────────────────────────
  activate(id: string): Observable<boolean> {
    return this.http.patch<any>(`${this.API}/${id}/activate`, {}, { headers: this.headers() })
      .pipe(catchError(() => {
        const emp = this.storage.getEmpleados().find(e => e.id === id);
        if (emp) { emp.activo = true; emp.razonInactividad = undefined; this.storage.upsertEmpleado(emp); }
        return of(true);
      }));
  }

  // ── DELETE ─────────────────────────────────────────────────
  delete(id: string): Observable<boolean> {
    return this.http.delete<any>(`${this.API}/${id}`, { headers: this.headers() })
      .pipe(catchError(() => {
        this.storage.eliminarEmpleado(id);
        return of(true);
      }));
  }
}
