import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemeMode } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="theme-toggle" (click)="toggleTheme()" [attr.aria-label]="'Toggle ' + (isDarkTheme ? 'light' : 'dark') + ' mode'">
      <i class="bi" [ngClass]="isDarkTheme ? 'bi-sun-fill' : 'bi-moon-fill'"></i>
    </button>
  `,
  styles: [`
    .theme-toggle {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 8px;
      font-size: 1.2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    
    .theme-toggle:hover {
      background-color: rgba(128, 128, 128, 0.2);
    }
    
    :host-context(.dark-theme) .theme-toggle {
      color: #fff;
    }
    
    :host-context(.light-theme) .theme-toggle {
      color: #333;
    }
  `]
})
export class ThemeToggleComponent implements OnInit {
  isDarkTheme = false;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
} 