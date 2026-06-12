// ============================================================
// GUARD DE AUTENTICACIÓN
// ============================================================
// Protege las rutas que requieren sesión iniciada.
// Si el usuario no está autenticado, lo redirige al login.
//
// Ya está conectado al FirebaseAuthService — no necesitas
// modificar este archivo al activar Firebase real.
// ============================================================

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FirebaseAuthService } from '../services/firebase-auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(FirebaseAuthService);
  const router      = inject(Router);

  if (authService.estaAutenticado) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
