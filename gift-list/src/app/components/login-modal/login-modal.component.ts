import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" *ngIf="visible" (click)="closeOnBackdrop($event)"></div>
    <div class="login-modal" *ngIf="visible">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title">Connexion Admin</h5>
          <button type="button" class="btn-close btn-close-white" (click)="closeModal()"></button>
        </div>
        <div class="modal-body">
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
                autofocus
              >
            </div>
            <div *ngIf="loginError" class="alert alert-danger">
              Mot de passe incorrect
            </div>
            <div class="d-grid">
              <button type="submit" class="btn btn-primary">
                <i class="bi bi-lock"></i> Se connecter
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1040;
    }
    
    .login-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
    }
    
    .modal-content {
      width: 100%;
      max-width: 400px;
      background-color: var(--modal-bg, #fff);
      color: var(--modal-color, #212529);
      border-radius: 0.3rem;
      box-shadow: 0 0.5rem 1rem var(--shadow-color, rgba(0, 0, 0, 0.15));
      margin: 1.75rem;
      animation: fadeIn 0.3s ease;
    }
    
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--border-color, #dee2e6);
      border-top-left-radius: 0.3rem;
      border-top-right-radius: 0.3rem;
    }
    
    .modal-body {
      padding: 1rem;
    }
    
    :host-context(.dark-theme) .form-label {
      color: var(--card-color);
    }
    
    :host-context(.dark-theme) .form-control {
      background-color: var(--input-bg);
      color: var(--input-color);
      border-color: var(--input-border);
    }
    
    :host-context(.dark-theme) .form-control:focus {
      background-color: var(--input-bg);
      color: var(--input-color);
      border-color: var(--primary-color);
      box-shadow: 0 0 0 0.25rem rgba(var(--primary-color-rgb, 99, 102, 241), 0.25);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class LoginModalComponent {
  @Output() modalClosed = new EventEmitter<void>();
  
  password = '';
  loginError = false;
  visible = true;

  constructor(private authService: AuthService) {}

  closeOnBackdrop(event: MouseEvent): void {
    // Only close if clicking directly on the backdrop
    if ((event.target as HTMLElement).className === 'modal-backdrop') {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.visible = false;
    this.password = '';
    this.loginError = false;
    setTimeout(() => this.modalClosed.emit(), 100);
  }

  onLogin(): void {
    if (this.password) {
      const success = this.authService.login(this.password);
      
      if (success) {
        this.closeModal();
      } else {
        this.loginError = true;
      }
    } else {
      this.loginError = true;
    }
  }
} 