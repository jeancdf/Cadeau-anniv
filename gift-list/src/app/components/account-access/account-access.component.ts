import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AccountService, AccountUser } from '../../services/account.service';

type AccountMode = 'login' | 'register';

@Component({
  selector: 'app-account-access',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-access.component.html',
  styleUrl: './account-access.component.css'
})
export class AccountAccessComponent implements OnInit {
  @Input() variant: 'compact' | 'cta' = 'compact';
  @Input() guestLabel = 'Se connecter';
  @Output() authenticated = new EventEmitter<AccountUser>();

  user: AccountUser | null = null;
  isReady = false;
  isOpen = false;
  isSubmitting = false;
  mode: AccountMode = 'login';
  displayName = '';
  email = '';
  password = '';
  errorMessage = '';

  constructor(
    private readonly accountService: AccountService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.accountService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => this.user = user);
    this.accountService.ready$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isReady => this.isReady = isReady);
  }

  get triggerLabel(): string {
    if (this.user) {
      return this.variant === 'cta' ? 'Voir mes listes' : this.user.displayName.split(' ')[0];
    }
    return this.guestLabel;
  }

  handleTrigger(): void {
    if (this.user) {
      void this.router.navigateByUrl('/mes-listes');
      return;
    }
    this.isOpen = true;
    this.errorMessage = '';
  }

  close(): void {
    if (this.isSubmitting) {
      return;
    }
    this.isOpen = false;
    this.errorMessage = '';
    this.password = '';
  }

  switchMode(mode: AccountMode): void {
    this.mode = mode;
    this.errorMessage = '';
    this.password = '';
  }

  submit(): void {
    const email = this.email.trim();
    const displayName = this.displayName.trim();
    if (!email || !this.password || (this.mode === 'register' && !displayName)) {
      this.errorMessage = 'Complétez les champs pour continuer.';
      return;
    }
    if (this.mode === 'register' && this.password.length < 10) {
      this.errorMessage = 'Choisissez un mot de passe d’au moins 10 caractères.';
      return;
    }

    const request = this.mode === 'register'
      ? this.accountService.register(displayName, email, this.password)
      : this.accountService.login(email, this.password);
    this.isSubmitting = true;
    this.errorMessage = '';
    request.pipe(finalize(() => this.isSubmitting = false)).subscribe({
      next: user => {
        this.isOpen = false;
        this.password = '';
        this.authenticated.emit(user);
      },
      error: error => {
        this.errorMessage = error?.error?.message || 'Impossible de continuer pour le moment.';
      }
    });
  }
}
