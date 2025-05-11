import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Hardcoded credentials
  private readonly ADMIN_PASSWORD = 'cadeau2023';
  
  // Authentication state
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  constructor() {
    // Check if user was previously logged in (from session storage)
    const savedAuth = sessionStorage.getItem('isAuthenticated');
    if (savedAuth === 'true') {
      this.isAuthenticatedSubject.next(true);
    }
  }
  
  /**
   * Attempt to log in with the provided password
   */
  login(password: string): boolean {
    const isValid = password === this.ADMIN_PASSWORD;
    
    if (isValid) {
      this.isAuthenticatedSubject.next(true);
      sessionStorage.setItem('isAuthenticated', 'true');
    }
    
    return isValid;
  }
  
  /**
   * Log out the current user
   */
  logout(): void {
    this.isAuthenticatedSubject.next(false);
    sessionStorage.removeItem('isAuthenticated');
  }
  
  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
} 