import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, finalize, map, Observable, of, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SharedListService } from './shared-list.service';
import { Router } from '@angular/router';

export interface AccountUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AccountListSummary {
  slug: string;
  title: string;
  occasion: string;
  audienceLabel: string;
  giftCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AccountResponse {
  user: AccountUser | null;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly userSubject = new BehaviorSubject<AccountUser | null>(null);
  private readonly readySubject = new BehaviorSubject(false);

  readonly user$ = this.userSubject.asObservable();
  readonly ready$ = this.readySubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly sharedListService: SharedListService,
    private readonly router: Router
  ) {
    this.refreshSession().subscribe();
  }

  get currentUser(): AccountUser | null {
    return this.userSubject.value;
  }

  login(email: string, password: string): Observable<AccountUser> {
    return this.authenticate('/account/login', { email, password });
  }

  register(displayName: string, email: string, password: string): Observable<AccountUser> {
    return this.authenticate('/account/register', { displayName, email, password });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/account/logout`, {}, {
      withCredentials: true
    }).pipe(
      catchError(() => of(void 0)),
      finalize(() => {
        this.userSubject.next(null);
        void this.router.navigateByUrl('/', { replaceUrl: true });
      })
    );
  }

  getLists(): Observable<AccountListSummary[]> {
    return this.http.get<{ lists: AccountListSummary[] }>(`${environment.apiUrl}/account/lists`, {
      withCredentials: true
    }).pipe(map(response => response.lists || []));
  }

  refreshSession(): Observable<AccountUser | null> {
    return this.http.get<AccountResponse>(`${environment.apiUrl}/account/me`, {
      withCredentials: true
    }).pipe(
      map(response => response.user),
      switchMap(user => user
        ? this.sharedListService.claimLocalLists().pipe(map(() => user))
        : of(null)),
      tap(user => this.userSubject.next(user)),
      catchError(() => {
        this.userSubject.next(null);
        return of(null);
      }),
      finalize(() => this.readySubject.next(true))
    );
  }

  private authenticate(path: string, payload: object): Observable<AccountUser> {
    return this.http.post<{ user: AccountUser }>(`${environment.apiUrl}${path}`, payload, {
      withCredentials: true
    }).pipe(
      map(response => response.user),
      switchMap(user => this.sharedListService.claimLocalLists().pipe(map(() => user))),
      tap(user => this.userSubject.next(user))
    );
  }
}
