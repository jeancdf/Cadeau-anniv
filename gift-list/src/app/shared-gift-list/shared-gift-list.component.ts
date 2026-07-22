import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GiftPlannerService, SharedGift, SharedGiftLink, SharedGiftList } from '../services/gift-planner.service';

@Component({
  selector: 'app-shared-gift-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shared-gift-list.component.html',
  styleUrl: './shared-gift-list.component.css'
})
export class SharedGiftListComponent implements OnInit {
  sharedList?: SharedGiftList;
  isLoading = true;
  loadError = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly plannerService: GiftPlannerService,
    private readonly title: Title,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    const publicId = String(this.route.snapshot.paramMap.get('publicId') || '');
    if (!/^[A-Za-z0-9_-]{16}$/.test(publicId)) {
      this.isLoading = false;
      this.loadError = 'Ce lien de liste est invalide.';
      return;
    }

    this.plannerService.getSharedList(publicId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: sharedList => {
          this.sharedList = sharedList;
          this.isLoading = false;
          this.title.setTitle(`Liste de cadeaux · ${sharedList.occasion} · Gift Finder`);
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;
          this.loadError = error.status === 404
            ? 'Cette liste n’existe pas ou plus.'
            : 'Impossible de charger cette liste pour le moment.';
        }
      });
  }

  trackGift(index: number, gift: SharedGift): string {
    return `${gift.name}-${index}`;
  }

  trackShoppingLink(index: number, link: SharedGiftLink): string {
    return `${link.merchant}-${index}`;
  }

  formatCreationDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date);
  }
}
