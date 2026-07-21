import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { GiftListComponent } from './gift-list/gift-list.component';
import { LoginModalComponent } from './components/login-modal/login-modal.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { VersionDisplayComponent } from './components/version-display/version-display.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    GiftListComponent,
    LoginModalComponent,
    VersionDisplayComponent,
    ThemeToggleComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  showModal = false;

  private showLoginModalHandler = () => this.showLoginModal();

  constructor(
    private readonly authService: AuthService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.authService.isAuthenticated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
      });
    window.addEventListener('show-login-modal', this.showLoginModalHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('show-login-modal', this.showLoginModalHandler);
  }

  showLoginModal(): void {
    this.showModal = true;
  }
  
  onModalClosed(): void {
    this.showModal = false;
  }
  
  logout(): void {
    this.authService.logout();
  }
}
