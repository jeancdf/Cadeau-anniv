import { Component, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { GiftPlannerComponent, PLANNER_STORAGE_KEY } from './gift-planner/gift-planner.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { VersionDisplayComponent } from './components/version-display/version-display.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet, ThemeToggleComponent, VersionDisplayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  @ViewChild(RouterOutlet) private outlet?: RouterOutlet;

  constructor(private readonly router: Router) {}

  get isSharedListRoute(): boolean {
    return this.router.url.startsWith('/liste/');
  }

  startNewList(): void {
    if (this.outlet?.isActivated && this.outlet.component instanceof GiftPlannerComponent) {
      this.outlet.component.restart();
      return;
    }

    localStorage.removeItem(PLANNER_STORAGE_KEY);
    void this.router.navigateByUrl('/');
  }
}
