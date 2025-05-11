import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GiftListComponent } from './gift-list/gift-list.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../environments/environment';
import { LoginModalComponent } from './components/login-modal/login-modal.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { VersionDisplayComponent } from './components/version-display/version-display.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    GiftListComponent,
    LoginModalComponent,
    VersionDisplayComponent,
    ThemeToggleComponent,
    HttpClientModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'gift-list';
  isAuthenticated = false;
  showModal = false;
  
  // Store the event handler reference for proper removal
  private showLoginModalHandler = () => this.showLoginModal();
  
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    // Subscribe to authentication state
    this.authService.isAuthenticated$.subscribe(
      isAuth => this.isAuthenticated = isAuth
    );
    
    // Log environment for debugging
    console.log('Environment:', environment);
    console.log('Is Production:', environment.production);
    console.log('API URL:', environment.apiUrl);

    this.checkBackendConnection();
    
    // Add event listener for custom login modal event
    window.addEventListener('show-login-modal', this.showLoginModalHandler);
  }
  
  ngOnDestroy(): void {
    // Remove event listener when component is destroyed
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
  
  private checkBackendConnection(): void {
    const healthEndpoint = `${environment.apiUrl}/health`;
    
    console.log('Checking connection to backend at:', environment.apiUrl);
    
    this.http.get(healthEndpoint).subscribe({
      next: (response) => {
        console.log('✅ Successfully connected to the backend:', environment.apiUrl);
        console.log('Backend response:', response);
      },
      error: (error) => {
        console.error('❌ Failed to connect to the backend:', environment.apiUrl);
        console.error('Connection error:', error);
      }
    });
  }
}
