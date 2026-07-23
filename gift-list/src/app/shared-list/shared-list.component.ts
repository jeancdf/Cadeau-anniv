import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedList, SharedListService, SharedShoppingLink } from '../services/shared-list.service';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';
import { PLANNER_STORAGE_KEY } from '../gift-planner/planner-storage';
import { AccountAccessComponent } from '../components/account-access/account-access.component';

@Component({
  selector: 'app-shared-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ThemeToggleComponent, AccountAccessComponent],
  templateUrl: './shared-list.component.html',
  styleUrl: './shared-list.component.css'
})
export class SharedListComponent implements OnInit {
  sharedList: SharedList | null = null;
  isLoading = true;
  notFound = false;
  loadError = '';
  failedImages = new Set<number>();
  private currentSlug = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly sharedListService: SharedListService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.currentSlug = params.get('slug') || '';
        this.loadList();
      });
  }

  loadList(): void {
    this.isLoading = true;
    this.notFound = false;
    this.loadError = '';
    this.failedImages.clear();

    this.sharedListService.getSharedList(this.currentSlug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: sharedList => {
        this.sharedList = sharedList;
        this.isLoading = false;
      },
      error: error => {
        this.isLoading = false;
        this.sharedList = null;
        this.notFound = error?.status === 404;
        this.loadError = this.notFound ? '' : 'La liste ne peut pas être chargée pour le moment.';
      }
    });
  }

  markImageAsFailed(index: number): void {
    this.failedImages.add(index);
  }

  trackGiftClick(gift: SharedList['gifts'][number], linkKey: string): void {
    if (!this.sharedList?.slug || !gift.id) {
      return;
    }
    this.sharedListService.trackGiftClick(this.sharedList.slug, gift.id, linkKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  startNewList(): void {
    localStorage.removeItem(PLANNER_STORAGE_KEY);
  }

  trackShoppingLink(index: number, link: SharedShoppingLink): string {
    return `${link.trackingKey}-${index}`;
  }
}
