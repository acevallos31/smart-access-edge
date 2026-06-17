import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

interface CatalogItemRaw {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly API = `${environment.apiUrl}/catalog`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.usuarioActual?.token ?? this.auth.usuarioActual?.idToken ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private mapNames(items: CatalogItemRaw[]): string[] {
    return (items ?? []).map(i => i?.name).filter((x): x is string => !!x).sort((a, b) => a.localeCompare(b));
  }

  getRoles(): Observable<string[]> {
    return this.http.get<CatalogItemRaw[]>(`${this.API}/roles`, { headers: this.headers() }).pipe(
      map(items => this.mapNames(items)),
      catchError(err => throwError(() => new Error(err?.error?.message ?? 'Error obteniendo roles')))
    );
  }

  addRole(name: string): Observable<void> {
    return this.http.post<void>(`${this.API}/roles`, { name }, { headers: this.headers() }).pipe(
      catchError(err => throwError(() => new Error(err?.error?.message ?? 'Error creando rol')))
    );
  }

  getDepartments(): Observable<string[]> {
    return this.http.get<CatalogItemRaw[]>(`${this.API}/departments`, { headers: this.headers() }).pipe(
      map(items => this.mapNames(items)),
      catchError(err => throwError(() => new Error(err?.error?.message ?? 'Error obteniendo departamentos')))
    );
  }

  addDepartment(name: string): Observable<void> {
    return this.http.post<void>(`${this.API}/departments`, { name }, { headers: this.headers() }).pipe(
      catchError(err => throwError(() => new Error(err?.error?.message ?? 'Error creando departamento')))
    );
  }
}
