import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';
import { AuthService } from '../services/auth.service';
import { GiftStats, StatsOverview, StatsService } from '../services/stats.service';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ThemeToggleComponent],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css'
})
export class StatsComponent implements OnInit {
  isAuthenticated = false;
  isLoggingIn = false;
  isLoading = false;
  password = '';
  searchQuery = '';
  loginError = '';
  loadError = '';
  stats: StatsOverview | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly statsService: StatsService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.authService.isAuthenticated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
        if (isAuthenticated && !this.stats && !this.isLoading) {
          this.loadStats();
        }
      });
  }

  get filteredGifts(): GiftStats[] {
    const query = this.searchQuery.trim().toLocaleLowerCase('fr');
    if (!query || !this.stats) {
      return this.stats?.gifts || [];
    }
    return this.stats.gifts.filter(gift => (
      `${gift.giftName} ${gift.listTitle} ${gift.budgetLabel} ${gift.merchants.map(item => item.merchant).join(' ')}`
        .toLocaleLowerCase('fr')
        .includes(query)
    ));
  }

  login(): void {
    if (!this.password || this.isLoggingIn) {
      this.loginError = 'Saisissez le mot de passe administrateur.';
      return;
    }

    this.isLoggingIn = true;
    this.loginError = '';
    this.authService.login(this.password)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoggingIn = false)
      )
      .subscribe(success => {
        this.password = '';
        if (!success) {
          this.loginError = 'Mot de passe incorrect.';
        }
      });
  }

  loadStats(): void {
    if (!this.isAuthenticated || this.isLoading) {
      return;
    }
    this.isLoading = true;
    this.loadError = '';
    this.statsService.getOverview()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: stats => this.stats = stats,
        error: error => {
          if (error?.status === 403) {
            this.stats = null;
            this.authService.logout();
            this.loginError = 'Votre session a expiré. Reconnectez-vous.';
            return;
          }
          this.loadError = error?.error?.message || 'Impossible de charger les statistiques.';
        }
      });
  }

  logout(): void {
    this.authService.logout();
    this.stats = null;
    void this.router.navigateByUrl('/', { replaceUrl: true });
  }

  merchantSummary(gift: GiftStats): string {
    if (!gift.merchants.length) {
      return 'Aucun clic';
    }
    return gift.merchants.map(item => `${item.merchant} · ${item.clicks}`).join(', ');
  }
}
