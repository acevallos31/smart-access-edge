// ============================================================
// MODELOS DE DOMINIO — Smart Access Edge
// ============================================================

// Roles del sistema
// Roles con acceso ADMINISTRADOR: Jefe, Subjefe, Contador, Asistente del Jefe, Administrador
// Roles sin acceso admin: Empleado
export type RolSistema =
  | 'Administrador'
  | 'Jefe'
  | 'Subjefe'
  | 'Contador'
  | 'Asistente del Jefe'
  | 'Empleado';

// Razón por la que un usuario está inactivo
export type RazonInactividad = 'despedido' | 'retirado' | 'otro';

export interface UsuarioSesion {
  uid: string;
  email: string;
  nombre: string;
  rol: RolSistema | string;
  idToken: string;
  token?: string;       // JWT del backend
  checkedIn?: boolean;  // si ya registró entrada en el turno actual
  lastRecord?: string;  // descripción del último registro
}

export interface Employee {
  id?: string;
  nombre: string;
  departamento: string;
  cargo: string;
  rol?: RolSistema;           // rol en el sistema
  email?: string;             // correo del empleado
  password?: string;          // contraseña (solo visible para admins)
  horarioEntrada?: string;    // HH:mm  ej. "08:00"
  horarioSalida?:  string;    // HH:mm  ej. "17:00"
  horario?: { entrada: string; salida: string; }; // alias para compatibilidad en formularios
  fotoUrl?: string;
  activo: boolean;
  razonInactividad?: RazonInactividad;   // por qué está inactivo
  notaInactividad?: string;              // nota adicional (ej. "Retirado el 01/06/2026")
  createdAt?: string;
  createdBy?: string;
}

// Alias de compatibilidad con código anterior
export interface Horario {
  entrada: string;
  salida:  string;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  userName: string;
  employeeId: string;
  departamento: string;
  department?: string;   // alias para compatibilidad (apunta a departamento)
  eventType: 'entrada' | 'salida';
  scheduledTime: string;
  recordedTime: string;
  status: 'puntual' | 'tardanza' | 'ausente';
  captureUrl?: string;
  timestamp?: string;
}

export interface TrendPoint {
  fecha:      string;
  porcentaje: number;
  presentes?: number;
  tardanzas?: number;
  ausentes?:  number;
}

export interface AttendanceStatistics {
  totalEmpleados:       number;
  presentes:            number;
  registrosHoy?:        number;
  puntuales?:           number;
  tardanzas:            number;
  ausentes:             number;
  porcentajeAsistencia: number;
  porDepartamento:      DepartmentStat[];
  tendenciaSemanal:     TrendPoint[];
  tendencia?:           TrendPoint[];
}

export interface DepartmentStat {
  departamento: string;
  total:        number;
  presentes:    number;
  tardanzas:    number;
  ausentes:     number;
  porcentaje:   number;
}

export interface CheckInResult {
  success:       boolean;
  yaRegistrado:  boolean;
  message:       string;
  recordId?:     string;
  recordedTime?: string;
  status?:       string;
}

// ── Helpers de roles ─────────────────────────────────────────
/** Roles que tienen acceso de administración */
export const ROLES_ADMIN: RolSistema[] = [
  'Administrador', 'Jefe', 'Subjefe', 'Contador', 'Asistente del Jefe'
];

/** Verifica si un rol tiene acceso de administración */
export function esRolAdmin(rol: string): boolean {
  return ROLES_ADMIN.includes(rol as RolSistema);
}
