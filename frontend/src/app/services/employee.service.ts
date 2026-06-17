// ============================================================
// EMPLOYEE SERVICE — Solo backend, sin localStorage
// Todos los datos van a Firebase vía el backend .NET
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

  getAll(soloActivos?: boolean): Observable<Employee[]> {
    const p = soloActivos !== undefined ? `?soloActivos=${soloActivos}` : '';
    return this.http.get<Employee[]>(`${this.API}${p}`, { headers: this.headers() })
      .pipe(catchError(this.handleErr('getAll')));
  }

  getById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.API}/${id}`, { headers: this.headers() })
      .pipe(catchError(this.handleErr('getById')));
  }

  create(emp: Employee): Observable<Employee> {
    return this.http.post<Employee>(this.API, emp, { headers: this.headers() })
      .pipe(catchError(this.handleErr('create')));
  }

  update(id: string, emp: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.API}/${id}`, emp, { headers: this.headers() })
      .pipe(catchError(this.handleErr('update')));
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
