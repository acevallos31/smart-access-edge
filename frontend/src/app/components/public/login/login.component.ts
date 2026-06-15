import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatInputModule, MatFormFieldModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email    = '';
  password = '';
  errorMessage = '';
  cargando = false;
  mostrarPassword = false;
  mostrarRecuperar = false;
  emailRecuperar = '';
  mensajeRecuperar = '';

  constructor(private auth: AuthService, private router: Router) {
    // Si ya está autenticado, redirigir
    if (this.auth.estaAutenticado) {
      this.redirigir();
    }
  }

  ejecutarLogin() {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor ingresa tu correo y contraseña.';
      return;
    }
    this.cargando = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.cargando = false; this.redirigir(); },
      error: (msg: string) => { this.cargando = false; this.errorMessage = msg; }
    });
  }

  recuperarContrasena() {
    if (!this.emailRecuperar) {
      this.mensajeRecuperar = 'Ingresa tu correo.';
      return;
    }
    this.auth.recuperarContrasena(this.emailRecuperar).subscribe({
      next: () => { this.mensajeRecuperar = '✓ Correo de recuperación enviado. Revisa tu bandeja.'; },
      error: () => { this.mensajeRecuperar = 'Error al enviar correo. Verifica la dirección.'; }
    });
  }

  private redirigir() {
    if (this.auth.esAdmin) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/employee/dashboard']);
    }
  }

  irRegistro() { this.router.navigate(['/register']); }
}
