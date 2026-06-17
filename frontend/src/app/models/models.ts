// ============================================================
// MODELOS DE DOMINIO — Smart Access Edge
// ============================================================

// Roles del sistema
// Roles de sistema:
// - Administrador: acceso y modificación completa
// - Supervisor: acceso de solo lectura al panel y reportes
// - Usuario: vista de empleado
export type RolSistema =
  | 'Administrador'
  | 'Supervisor'
  | 'Usuario';

// Razón por la que un usuario está inactivo
export type RazonInactividad = 'despedido' | 'retirado' | 'otro';

export interface UsuarioSesion {
  uid: string;
  email: string;
  nombre: string;
  rol: RolSistema | string;
  token?: string;       // JWT del backend (estilo clase)
  idToken?: string;     // compatibilidad con implementación anterior
  checkedIn?: boolean;  // si ya registró entrada en el turno actual
  lastRecord?: string;  // descripción del último registro
}

export interface Employee {
  id?: string;
  nombre: string;
  departamento: string;
  cargo: string;
  turnoId?: string;
  turnoNombre?: string;
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
  turnoId?: string;
  turnoNombre?: string;
  eventType: 'entrada' | 'salida';
  scheduledTime: string;
  recordedTime: string;
  status: 'puntual' | 'tardanza' | 'ausente' | 'extra' | 'fuera de horario';
  captureUrl?: string;
  lugarRegistro?: string;
  ciudadRegistro?: string;
  paisRegistro?: string;
  latitudRegistro?: string;
  longitudRegistro?: string;
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
  periodoAplicado?:     'semana' | 'mes' | 'custom' | string;
  desde?:               string;
  hasta?:               string;
  customRange?:         boolean;
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
  'Administrador',
  'Supervisor'
];

const LEGACY_ADMIN_ROLES = ['Jefe', 'Subjefe', 'Contador', 'Asistente del Jefe'];

/** Normaliza roles históricos al nuevo esquema de 2 roles */
export function normalizarRolSistema(rol: string): RolSistema {
  const value = (rol ?? '').trim();

  if (value === 'Administrador' || LEGACY_ADMIN_ROLES.includes(value)) {
    return 'Administrador';
  }

  if (value === 'Supervisor') {
    return 'Supervisor';
  }

  return 'Usuario';
}

/** Verifica si un rol tiene acceso de administración */
export function esRolAdmin(rol: string): boolean {
  return ROLES_ADMIN.includes(normalizarRolSistema(rol));
}

/** Verifica si el rol puede modificar datos del panel administrativo */
export function puedeGestionarPanelAdmin(rol: string): boolean {
  return normalizarRolSistema(rol) === 'Administrador';
}
