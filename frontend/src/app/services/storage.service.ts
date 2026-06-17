// ============================================================
// STORAGE SERVICE — DESACTIVADO
// localStorage eliminado. Todo va al backend → Firebase.
// ============================================================
import { Injectable } from '@angular/core';
import { Employee, AttendanceRecord } from '../models/models';

@Injectable({ providedIn: 'root' })
export class StorageService {
  getEmpleados(): Employee[]                         { return []; }
  saveEmpleados(_: Employee[]): void                 {}
  upsertEmpleado(_: Employee): void                  {}
  eliminarEmpleado(_: string): void                  {}
  getRegistros(): AttendanceRecord[]                 { return []; }
  agregarRegistro(_: AttendanceRecord): void         {}
  getRegistrosPorUsuario(_: string): AttendanceRecord[] { return []; }
  getRegistrosHoy(): AttendanceRecord[]              { return []; }
  yaRegistroEntradaHoy(_: string): boolean           { return false; }
  guardarFotoRostro(_u: string, _d: string): void    {}
  obtenerFotoRostro(_: string): string | null        { return null; }
  tieneFotoRostro(_: string): boolean                { return false; }
  limpiarTodo(): void                                {}
}
