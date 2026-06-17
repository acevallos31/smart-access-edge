import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login',    loadComponent: () => import('./components/public/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./components/public/register/register.component').then(m => m.RegisterComponent) },
  { path: 'landing',  loadComponent: () => import('./components/public/landing/landing.component').then(m => m.LandingComponent) },

  // ── Admin ──────────────────────────────────────────────────
  { path: 'admin/dashboard',  loadComponent: () => import('./components/admin/dashboard/dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [adminGuard] },
  { path: 'admin/employees',  loadComponent: () => import('./components/admin/employee-management/employee-management.component').then(m => m.EmployeeManagementComponent), canActivate: [adminGuard] },
  { path: 'admin/employees/new',     loadComponent: () => import('./components/admin/employee-form/employee-form.component').then(m => m.EmployeeFormComponent), canActivate: [adminGuard] },
  { path: 'admin/employees/edit/:id',loadComponent: () => import('./components/admin/employee-form/employee-form.component').then(m => m.EmployeeFormComponent), canActivate: [adminGuard] },
  { path: 'admin/users',      loadComponent: () => import('./components/admin/user-management/user-management.component').then(m => m.UserManagementComponent), canActivate: [adminGuard] },
  { path: 'admin/catalogs',   loadComponent: () => import('./components/admin/catalogs/catalogs.component').then(m => m.CatalogsComponent), canActivate: [adminGuard] },
  { path: 'admin/turnos',     loadComponent: () => import('./components/admin/turno-management/turno-management.component').then(m => m.TurnoManagementComponent), canActivate: [adminGuard] },
  { path: 'admin/attendance', loadComponent: () => import('./components/admin/attendance-list/attendance-list.component').then(m => m.AttendanceListComponent), canActivate: [adminGuard] },
  { path: 'admin/reports',    loadComponent: () => import('./components/admin/reports/reports.component').then(m => m.ReportsComponent), canActivate: [adminGuard] },
  { path: 'admin/settings',    loadComponent: () => import('./components/admin/settings/settings.component').then(m => m.SettingsComponent), canActivate: [adminGuard] },


  // ── Empleado ───────────────────────────────────────────────
  { path: 'employee/dashboard',    loadComponent: () => import('./components/employee/dashboard/employee-dashboard.component').then(m => m.EmployeeDashboardComponent), canActivate: [authGuard] },
  { path: 'employee/check-in',     loadComponent: () => import('./components/employee/check-in/check-in.component').then(m => m.CheckInComponent), canActivate: [authGuard] },
  { path: 'employee/history',      loadComponent: () => import('./components/employee/attendance-history/attendance-history.component').then(m => m.AttendanceHistoryComponent), canActivate: [authGuard] },
  { path: 'employee/confirmation', loadComponent: () => import('./components/employee/attendance-confirmation/attendance-confirmation.component').then(m => m.AttendanceConfirmationComponent), canActivate: [authGuard] },
  { path: 'employee/already-checked-in', loadComponent: () => import('./components/employee/already-checked-in/already-checked-in.component').then(m => m.AlreadyCheckedInComponent), canActivate: [authGuard] },

  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
