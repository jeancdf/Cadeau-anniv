import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GiftListComponent } from './gift-list/gift-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    GiftListComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'gift-list';
}
