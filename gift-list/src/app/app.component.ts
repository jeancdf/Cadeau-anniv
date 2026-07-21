import { Component, ViewChild } from '@angular/core';
import { GiftPlannerComponent } from './gift-planner/gift-planner.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { VersionDisplayComponent } from './components/version-display/version-display.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GiftPlannerComponent, ThemeToggleComponent, VersionDisplayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  @ViewChild(GiftPlannerComponent) private planner?: GiftPlannerComponent;

  startNewList(): void {
    this.planner?.restart();
  }
}
