import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-version-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="version-info small text-muted">
      <span>v{{ version || '1.0.0' }}</span>
      <span *ngIf="buildDate" class="ms-2">
        <small class="opacity-75">{{ buildDate | date:'short' }}</small>
      </span>
    </div>
  `,
  styles: [`
    .version-info {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      opacity: 0.8;
    }
  `]
})
export class VersionDisplayComponent implements OnInit {
  version: string | null = null;
  buildDate: string | null = null;
  buildNumber: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadVersionInfo();
  }

  private loadVersionInfo(): void {
    this.http.get<any>('assets/version.json')
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.warn('Could not load version info, using defaults', error);
          // Return a default version object if the file can't be loaded
          return of({
            version: '1.0.0',
            buildDate: new Date().toISOString(),
            buildNumber: 0
          });
        })
      )
      .subscribe({
        next: (data) => {
          this.version = data.version;
          this.buildDate = data.buildDate;
          this.buildNumber = data.buildNumber;
        }
      });
  }
} 