import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GiftService } from '../services/gift.service';
import { GiftAiService } from '../services/gift-ai.service';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';

@Component({
  selector: 'app-gift-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CdkDropList,
    CdkDrag
  ],
  templateUrl: './gift-list.component.html',
  styleUrl: './gift-list.component.css'
})
export class GiftListComponent implements OnInit {
  gifts: any[] = [];
  giftForm: FormGroup;
  editMode = false;
  currentGiftId: string | null = null;
  aiPrompt = '';
  aiSuggestions: any[] = [];
  isLoading = false;
  isLoadingAi = false;
  existingListText = '';
  isImportingList = false;

  constructor(
    private giftService: GiftService,
    private giftAiService: GiftAiService,
    private fb: FormBuilder
  ) {
    this.giftForm = this.createGiftForm();
  }

  ngOnInit(): void {
    this.loadGifts();
  }

  // Chargement des cadeaux depuis l'API
  loadGifts(): void {
    this.isLoading = true;
    this.giftService.getGifts().subscribe({
      next: (data) => {
        this.gifts = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des cadeaux:', error);
        this.isLoading = false;
      }
    });
  }

  // Création du formulaire pour les cadeaux
  createGiftForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      pricePoints: this.fb.array([])
    });
  }

  // Getter pour accéder facilement au FormArray des price points
  get pricePointsArray(): FormArray {
    return this.giftForm.get('pricePoints') as FormArray;
  }

  // Ajouter un nouveau price point au formulaire
  addPricePoint(): void {
    const pricePointForm = this.fb.group({
      label: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      link: ['', Validators.required]
    });
    
    this.pricePointsArray.push(pricePointForm);
  }

  // Supprimer un price point du formulaire
  removePricePoint(index: number): void {
    this.pricePointsArray.removeAt(index);
  }

  // Soumettre le formulaire (ajouter ou modifier un cadeau)
  onSubmit(): void {
    if (this.giftForm.invalid) {
      return;
    }

    const giftData = this.giftForm.value;
    
    // Trier les price points par prix
    giftData.pricePoints.sort((a: any, b: any) => a.price - b.price);

    if (this.editMode && this.currentGiftId) {
      // Mise à jour d'un cadeau existant
      this.giftService.updateGift(this.currentGiftId, giftData).subscribe({
        next: () => {
          this.resetForm();
          this.loadGifts();
        },
        error: (error) => console.error('Erreur lors de la mise à jour du cadeau:', error)
      });
    } else {
      // Ajout d'un nouveau cadeau
      this.giftService.addGift(giftData).subscribe({
        next: () => {
          this.resetForm();
          this.loadGifts();
        },
        error: (error) => console.error('Erreur lors de l\'ajout du cadeau:', error)
      });
    }
  }

  // Réinitialiser le formulaire
  resetForm(): void {
    this.giftForm = this.createGiftForm();
    this.editMode = false;
    this.currentGiftId = null;
  }

  // Modifier un cadeau existant
  editGift(gift: any): void {
    this.editMode = true;
    this.currentGiftId = gift._id;
    
    // Réinitialiser le formulaire
    this.giftForm = this.createGiftForm();
    
    // Pré-remplir le formulaire avec les données du cadeau
    this.giftForm.patchValue({
      name: gift.name,
      description: gift.description
    });

    // Ajouter les price points existants
    this.pricePointsArray.clear();
    
    gift.pricePoints.forEach((point: any) => {
      this.pricePointsArray.push(
        this.fb.group({
          label: [point.label, Validators.required],
          price: [point.price, [Validators.required, Validators.min(0)]],
          link: [point.link, Validators.required]
        })
      );
    });
  }

  // Supprimer un cadeau
  deleteGift(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce cadeau ?')) {
      this.giftService.deleteGift(id).subscribe({
        next: () => this.loadGifts(),
        error: (error) => console.error('Erreur lors de la suppression du cadeau:', error)
      });
    }
  }

  // Gérer le drag & drop pour réordonner les cadeaux
  drop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.gifts, event.previousIndex, event.currentIndex);
    
    // Mettre à jour les priorités sur le backend
    this.gifts.forEach((gift, index) => {
      const updatedGift = { ...gift, priority: index };
      this.giftService.updateGift(gift._id, updatedGift).subscribe({
        error: (error) => console.error(`Erreur lors de la mise à jour de la priorité pour ${gift.name}:`, error)
      });
    });
  }

  // Générer des suggestions d'IA
  generateAiSuggestions(): void {
    if (!this.aiPrompt.trim()) {
      return;
    }
    
    this.isLoadingAi = true;
    this.giftAiService.generateGiftSuggestions(this.aiPrompt).subscribe({
      next: (data) => {
        this.aiSuggestions = data.suggestions || [];
        this.isLoadingAi = false;
      },
      error: (error) => {
        console.error('Erreur lors de la génération de suggestions:', error);
        this.isLoadingAi = false;
      }
    });
  }

  // Ajouter une suggestion d'IA à la liste
  addAiSuggestion(suggestion: any): void {
    const giftData = {
      name: suggestion.name,
      description: suggestion.description,
      pricePoints: suggestion.pricePoints
    };
    
    this.giftService.addGift(giftData).subscribe({
      next: () => {
        this.loadGifts();
      },
      error: (error) => console.error('Erreur lors de l\'ajout de la suggestion:', error)
    });
  }

  // Exporter la liste au format JSON
  exportList(): void {
    this.giftService.exportGifts().subscribe({
      next: (data) => {
        this.giftService.downloadGiftsAsJson(data);
      },
      error: (error) => console.error('Erreur lors de l\'exportation de la liste:', error)
    });
  }

  // Importer une liste existante
  importExistingList(): void {
    if (!this.existingListText.trim()) {
      return;
    }

    this.isImportingList = true;
    this.giftAiService.importExistingGiftList(this.existingListText).subscribe({
      next: (data) => {
        const suggestions = data.suggestions || [];
        
        // Ajouter chaque cadeau de la liste importée
        if (suggestions.length > 0) {
          let addedCount = 0;
          
          const addNextGift = (index: number) => {
            if (index >= suggestions.length) {
              this.isImportingList = false;
              this.existingListText = '';
              this.loadGifts();
              return;
            }
            
            const gift = suggestions[index];
            this.giftService.addGift(gift).subscribe({
              next: () => {
                addedCount++;
                addNextGift(index + 1);
              },
              error: (error) => {
                console.error(`Erreur lors de l'ajout du cadeau ${gift.name}:`, error);
                addNextGift(index + 1);
              }
            });
          };
          
          // Démarrer l'ajout séquentiel
          addNextGift(0);
        } else {
          this.isImportingList = false;
          console.warn('Aucun cadeau trouvé dans la liste importée');
        }
      },
      error: (error) => {
        console.error('Erreur lors de l\'importation de la liste:', error);
        this.isImportingList = false;
      }
    });
  }
}
