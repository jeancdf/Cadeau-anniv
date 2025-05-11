import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private themeSubject = new BehaviorSubject<ThemeMode>(this.getInitialTheme());
  public theme$: Observable<ThemeMode> = this.themeSubject.asObservable();
  
  private readonly THEME_KEY = 'preferred-theme';

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initialize();
  }

  private getInitialTheme(): ThemeMode {
    // Check if theme was saved in localStorage
    const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeMode;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }
    
    // Otherwise check prefers-color-scheme media query
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // Default to light theme
    return 'light';
  }

  private initialize(): void {
    // Apply the initial theme
    const theme = this.themeSubject.getValue();
    this.applyTheme(theme);
    
    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(this.THEME_KEY)) {
          const newTheme: ThemeMode = e.matches ? 'dark' : 'light';
          this.themeSubject.next(newTheme);
          this.applyTheme(newTheme);
        }
      });
    }
  }

  public toggleTheme(): void {
    const currentTheme = this.themeSubject.getValue();
    const newTheme: ThemeMode = currentTheme === 'light' ? 'dark' : 'light';
    this.themeSubject.next(newTheme);
    localStorage.setItem(this.THEME_KEY, newTheme);
    this.applyTheme(newTheme);
  }

  public setTheme(theme: ThemeMode): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: ThemeMode): void {
    const bodyElement = document.body;
    
    if (theme === 'dark') {
      this.renderer.addClass(bodyElement, 'dark-theme');
      this.renderer.removeClass(bodyElement, 'light-theme');
    } else {
      this.renderer.addClass(bodyElement, 'light-theme');
      this.renderer.removeClass(bodyElement, 'dark-theme');
    }
  }
} 