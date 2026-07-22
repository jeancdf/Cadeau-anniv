import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedList, SharedListService } from '../services/shared-list.service';

@Component({
  selector: 'app-shared-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shared-list.component.html',
  styleUrl: './shared-list.component.css'
})
export class SharedListComponent implements OnInit {
  sharedList: SharedList | null = null;
  isLoading = true;
  notFound = false;
  loadError = '';
  failedImages = new Set<number>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly sharedListService: SharedListService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.isLoading = true;
        this.notFound = false;
        this.loadError = '';
        this.failedImages.clear();
        return this.sharedListService.getSharedList(params.get('slug') || '');
      }),
      finalize(() => {
        this.isLoading = false;
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
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
}
