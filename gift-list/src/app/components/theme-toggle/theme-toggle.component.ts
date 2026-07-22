import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" class="theme-toggle" (click)="toggleTheme()" [attr.aria-label]="isDarkTheme ? 'Activer le thème clair' : 'Activer le thème sombre'">
      <i class="bi" [ngClass]="isDarkTheme ? 'bi-sun-fill' : 'bi-moon-fill'"></i>
    </button>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }

    .theme-toggle {
      cursor: pointer;
      width: 40px;
      height: 40px;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--surface);
      color: var(--ink);
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color .15s ease, border-color .15s ease, transform .15s ease;
    }
    
    .theme-toggle:hover {
      border-color: var(--ink);
      background-color: var(--surface);
      transform: translateY(-1px);
    }
  `]
})
export class ThemeToggleComponent implements OnInit {
  isDarkTheme = false;

  constructor(
    private readonly themeService: ThemeService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.themeService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(theme => {
        this.isDarkTheme = theme === 'dark';
      });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
