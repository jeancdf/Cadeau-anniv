import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  template: `
    <div class="login-container" *ngIf="!isLoggedIn">
      <div class="card shadow-sm">
        <div class="card-header bg-primary text-white">
          <h4 class="mb-0">Connexion Admin</h4>
        </div>
        <div class="card-body">
          <form (ngSubmit)="onLogin()">
            <div class="mb-3">
              <label for="password" class="form-label">Mot de passe</label>
              <input 
                type="password" 
                class="form-control" 
                id="password" 
                [(ngModel)]="password" 
                name="password" 
                placeholder="Entrez le mot de passe"
                required
              >
            </div>
            <div *ngIf="loginError" class="alert alert-danger">
              Mot de passe incorrect
            </div>
            <button type="submit" class="btn btn-primary w-100">
              <i class="bi bi-lock"></i> Se connecter
            </button>
          </form>
        </div>
      </div>
    </div>
    
    <div class="d-flex justify-content-end mb-3" *ngIf="isLoggedIn">
      <button class="btn btn-outline-secondary btn-sm" (click)="onLogout()">
        <i class="bi bi-box-arrow-right"></i> Déconnexion
      </button>
    </div>
  `,
  styles: [`
    .login-container {
      max-width: 400px;
      margin: 2rem auto;
    }
  `]
})
export class LoginComponent {
  password = '';
  loginError = false;
  isLoggedIn = false;

  constructor(private authService: AuthService) {
    this.authService.isAuthenticated$.subscribe(
      isAuth => this.isLoggedIn = isAuth
    );
  }

  onLogin(): void {
    if (this.password) {
      const success = this.authService.login(this.password);
      this.loginError = !success;
      if (success) {
        this.password = '';
      }
    } else {
      this.loginError = true;
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
} 