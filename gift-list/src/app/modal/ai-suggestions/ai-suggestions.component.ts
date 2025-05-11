import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GiftAiService } from '../../services/gift-ai.service';

@Component({
  selector: 'app-ai-suggestions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './ai-suggestions.component.html',
  styleUrl: './ai-suggestions.component.css'
})
export class AiSuggestionsComponent {
  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  @Output() addSuggestion = new EventEmitter<any>();
  
  prompt = '';
  suggestions: any[] = [];
  isLoading = false;

  constructor(private giftAiService: GiftAiService) {}

  // Fermer la modale
  closeModal(): void {
    this.close.emit();
    this.reset();
  }

  // Générer des suggestions
  generateSuggestions(): void {
    if (!this.prompt.trim()) {
      return;
    }

    this.isLoading = true;
    this.giftAiService.generateGiftSuggestions(this.prompt).subscribe({
      next: (data) => {
        this.suggestions = data.suggestions || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la génération de suggestions:', error);
        this.isLoading = false;
      }
    });
  }

  // Ajouter une suggestion à la liste
  onAddSuggestion(suggestion: any): void {
    this.addSuggestion.emit(suggestion);
  }

  // Réinitialiser l'état de la modale
  reset(): void {
    this.prompt = '';
    this.suggestions = [];
  }
}
