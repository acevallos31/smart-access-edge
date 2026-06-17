// ============================================================
// GUARDS DE AUTENTICACIÓN Y ROLES — Smart Access Edge
// ============================================================
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard general: requiere sesión activa
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.estaAutenticado) return true;

  router.navigate(['/login']);
  return false;
};

// Guard de panel admin (lectura): Administrador o Supervisor
export const adminViewGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.estaAutenticado && auth.esAdmin) return true;

  if (auth.estaAutenticado) {
    // Tiene sesión pero sin acceso al panel admin → lo manda al dashboard de empleado
    router.navigate(['/employee/dashboard']);
  } else {
    router.navigate(['/login']);
  }
  return false;
};

// Guard de modificación: solo Administrador
export const adminManageGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.estaAutenticado && auth.puedeGestionarAdmin) return true;

  if (auth.estaAutenticado) {
    router.navigate(['/admin/reports']);
  } else {
    router.navigate(['/login']);
  }

  return false;
};

export const adminGuard = adminViewGuard;
