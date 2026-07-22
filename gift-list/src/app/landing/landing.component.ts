import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';
import { AccountAccessComponent } from '../components/account-access/account-access.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent, AccountAccessComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {}
