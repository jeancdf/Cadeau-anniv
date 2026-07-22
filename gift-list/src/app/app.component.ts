import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { GiftPlannerComponent } from './gift-planner/gift-planner.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { VersionDisplayComponent } from './components/version-display/version-display.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ThemeToggleComponent, VersionDisplayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private activeRouteComponent: unknown;

  constructor(private readonly router: Router) {}

  get isSharedListRoute(): boolean {
    return this.router.url.startsWith('/liste/');
  }

  onRouteActivate(component: unknown): void {
    this.activeRouteComponent = component;
  }

  startNewList(): void {
    if (this.activeRouteComponent instanceof GiftPlannerComponent) {
      this.activeRouteComponent.restart();
      return;
    }
    void this.router.navigateByUrl('/');
  }
}
