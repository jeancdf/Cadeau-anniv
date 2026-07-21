import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  token: string;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'adminToken';
  private readonly expiryKey = 'adminTokenExpiresAt';
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidStoredToken());

  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  login(password: string): Observable<boolean> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { password }).pipe(
      tap(response => {
        sessionStorage.setItem(this.tokenKey, response.token);
        sessionStorage.setItem(this.expiryKey, String(response.expiresAt));
        this.isAuthenticatedSubject.next(true);
      }),
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  logout(): void {
    this.isAuthenticatedSubject.next(false);
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.expiryKey);
  }

  isAuthenticated(): boolean {
    if (!this.hasValidStoredToken()) {
      this.logout();
      return false;
    }
    return this.isAuthenticatedSubject.value;
  }

  getAuthToken(): string | null {
    if (!this.hasValidStoredToken()) {
      this.logout();
      return null;
    }
    return sessionStorage.getItem(this.tokenKey);
  }

  private hasValidStoredToken(): boolean {
    const token = sessionStorage.getItem(this.tokenKey);
    const expiresAt = Number(sessionStorage.getItem(this.expiryKey));
    return Boolean(token) && Number.isFinite(expiresAt) && expiresAt > Date.now();
  }
}
