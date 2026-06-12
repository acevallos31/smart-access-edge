import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/public/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'employee/check-in',
    loadComponent: () =>
      import('./check-in/check-in.component').then(m => m.CheckInComponent),
    canActivate: [authGuard]   // ← Ruta protegida: requiere sesión
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
