import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AccountListSummary, AccountService, AccountUser } from '../services/account.service';
import { AccountAccessComponent } from '../components/account-access/account-access.component';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';
import { PLANNER_STORAGE_KEY } from '../gift-planner/planner-storage';

@Component({
  selector: 'app-account-lists',
  standalone: true,
  imports: [CommonModule, RouterLink, AccountAccessComponent, ThemeToggleComponent],
  templateUrl: './account-lists.component.html',
  styleUrl: './account-lists.component.css'
})
export class AccountListsComponent implements OnInit {
  user: AccountUser | null = null;
  lists: AccountListSummary[] = [];
  isReady = false;
  isLoading = false;
  errorMessage = '';
  private loadedUserId = '';

  constructor(
    private readonly accountService: AccountService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.accountService.ready$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isReady => this.isReady = isReady);
    this.accountService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => {
        this.user = user;
        if (user && user.id !== this.loadedUserId) {
          this.loadedUserId = user.id;
          this.loadLists();
        } else if (!user) {
          this.loadedUserId = '';
          this.lists = [];
        }
      });
  }

  loadLists(): void {
    if (!this.user || this.isLoading) {
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.accountService.getLists().pipe(finalize(() => this.isLoading = false)).subscribe({
      next: lists => this.lists = lists,
      error: error => this.errorMessage = error?.error?.message || 'Impossible de charger vos listes.'
    });
  }

  createNewList(): void {
    localStorage.removeItem(PLANNER_STORAGE_KEY);
    void this.router.navigateByUrl('/creer');
  }

  logout(): void {
    this.accountService.logout().subscribe();
  }
}
