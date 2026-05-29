import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  // Variable para controlar la animación del banner
  hoveringBanner: boolean = false;

  constructor() {}

  ejecutarLogin() {
    if (!this.email || !this.password) {
      alert('Por favor complete los campos requeridos en verde.');
      return;
    }
    console.log('Intentando conectar con el sistema para:', this.email);
  }
}
