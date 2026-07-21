import { AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-backdrop" (click)="closeModal()"></div>
    <div class="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" (keydown.escape)="closeModal()">
      <div class="login-panel" (click)="$event.stopPropagation()">
        <header>
          <span class="login-icon"><i class="bi bi-key" aria-hidden="true"></i></span>
          <button type="button" (click)="closeModal()" aria-label="Fermer">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="login-copy">
          <p>Espace privé</p>
          <h2 id="login-title">Ouvrir l’atelier</h2>
          <span>Ajoutez, classez et affinez les idées de la liste.</span>
        </div>

        <form (ngSubmit)="onLogin()" novalidate>
          <label for="password">Mot de passe</label>
          <div class="password-field" [class.has-error]="loginError">
            <i class="bi bi-lock" aria-hidden="true"></i>
            <input
              #passwordInput
              type="password"
              id="password"
              [(ngModel)]="password"
              name="password"
              placeholder="Votre mot de passe"
              autocomplete="current-password"
              required>
          </div>
          <p class="login-error" *ngIf="loginError" role="alert">
            <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
            Mot de passe incorrect. Réessayez.
          </p>
          <button type="submit" class="login-submit" [disabled]="isSubmitting">
            {{ isSubmitting ? 'Vérification…' : 'Entrer dans l’atelier' }}
            <i class="bi" [ngClass]="isSubmitting ? 'bi-hourglass-split' : 'bi-arrow-right'" aria-hidden="true"></i>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-backdrop {
      position: fixed;
      z-index: 1100;
      inset: 0;
      background: rgba(17, 19, 16, .62);
      backdrop-filter: blur(4px);
    }

    .login-modal {
      position: fixed;
      z-index: 1110;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    .login-panel {
      width: min(430px, 100%);
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 1.5rem;
      background: var(--surface);
      color: var(--ink);
      box-shadow: 0 30px 100px rgba(0, 0, 0, .32);
      animation: enter 180ms ease-out;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .login-icon {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 1.1rem;
    }

    header button {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 50%;
      background: transparent;
      color: var(--ink);
      cursor: pointer;
    }

    .login-copy {
      padding: 2rem 0 1.6rem;
    }

    .login-copy p {
      margin: 0 0 .65rem;
      color: var(--accent);
      font-size: .67rem;
      font-weight: 850;
      letter-spacing: .17em;
      text-transform: uppercase;
    }

    .login-copy h2 {
      margin: 0 0 .75rem;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 2.5rem;
      font-weight: 400;
      letter-spacing: -.045em;
    }

    .login-copy span {
      color: var(--muted);
      font-size: .86rem;
    }

    form label {
      display: block;
      margin-bottom: .5rem;
      color: var(--ink-soft);
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .07em;
      text-transform: uppercase;
    }

    .password-field {
      display: flex;
      align-items: center;
      gap: .65rem;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 0 .9rem;
      background: var(--input-bg);
      color: var(--muted);
    }

    .password-field:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 13%, transparent);
    }

    .password-field.has-error {
      border-color: var(--danger);
    }

    .password-field input {
      width: 100%;
      min-height: 50px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--input-color);
    }

    .login-error {
      display: flex;
      align-items: center;
      gap: .45rem;
      margin: .65rem 0 0;
      color: var(--danger);
      font-size: .75rem;
    }

    .login-submit {
      width: 100%;
      min-height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .7rem;
      margin-top: 1rem;
      border: 0;
      border-radius: 999px;
      background: var(--ink);
      color: var(--surface);
      font-size: .82rem;
      font-weight: 800;
      cursor: pointer;
    }

    .login-submit:hover {
      background: var(--ink-soft);
    }

    .login-submit:disabled {
      opacity: .6;
      cursor: wait;
    }

    @keyframes enter {
      from { opacity: 0; transform: translateY(12px) scale(.98); }
    }
  `]
})
export class LoginModalComponent implements AfterViewInit {
  @Output() modalClosed = new EventEmitter<void>();
  @ViewChild('passwordInput') passwordInput?: ElementRef<HTMLInputElement>;

  password = '';
  loginError = false;
  isSubmitting = false;

  constructor(private readonly authService: AuthService) {}

  ngAfterViewInit(): void {
    window.setTimeout(() => this.passwordInput?.nativeElement.focus());
  }

  closeModal(): void {
    this.password = '';
    this.loginError = false;
    this.modalClosed.emit();
  }

  onLogin(): void {
    if (!this.password || this.isSubmitting) {
      this.loginError = true;
      this.passwordInput?.nativeElement.focus();
      return;
    }

    this.loginError = false;
    this.isSubmitting = true;
    this.authService.login(this.password)
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe(success => {
        if (success) {
          this.closeModal();
        } else {
          this.loginError = true;
          this.passwordInput?.nativeElement.focus();
        }
      });
  }
}
