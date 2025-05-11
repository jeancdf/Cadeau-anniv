import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GiftService } from '../services/gift.service';
import { GiftAiService } from '../services/gift-ai.service';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

interface CheaperAlternative {
  label: string;
  price: number;
  link: string;
  description: string;
}

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
export class GiftListComponent implements OnInit, OnDestroy {
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
  isAuthenticated = false;
  
  // AI preferences
  aiMinPrice = 20;
  aiMaxPrice = 200;
  aiPreferences = '';
  aiDislikes = '';
  
  // AI reasoning information
  aiAnalysisIntro = '';
  aiAnalysisMethod = '';
  aiIdentifiedInterests: string[] = [];
  aiInterestPatterns = '';
  showAiReasoning = false;
  
  // AI category exploration
  suggestedCategories: any[] = [];
  isLoadingSuggestions = false;
  selectedCategory: string = '';
  showCategorySuggestions = false;
  categoryAnalysisExplanation = '';
  
  // Find Link Modal data
  showFindLinkModal = false;
  searchingForLinks = false;
  alternativeLinks: { url: string, title: string, price?: string }[] = [];
  currentSearchItem = '';
  currentPricePoint: any = null;

  // Cheaper Alternatives Modal data
  showCheaperAlternativesModal = false;
  loadingCheaperAlternatives = false;
  cheaperAlternatives: CheaperAlternative[] = [];
  currentProductName = '';
  currentProductOption = '';
  currentProductPrice = 0;
  currentGiftForAlternatives: any = null;

  // References to modal elements for focus management
  @ViewChild('modalContent') modalContent!: ElementRef;
  @ViewChild('closeButton') closeButton!: ElementRef;

  // Store last focused element before modal opens
  private lastFocusedElement: HTMLElement | null = null;
  private modalFocusableElements: HTMLElement[] = [];

  // Add after isLoadingSuggestions = false;
  showFullAnalysis = false;
  expandedSuggestions: boolean[] = [];

  constructor(
    private giftService: GiftService,
    private giftAiService: GiftAiService,
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.giftForm = this.createGiftForm();
  }

  ngOnInit(): void {
    this.loadGifts();
    
    // Subscribe to authentication changes
    this.authService.isAuthenticated$.subscribe(
      isAuth => this.isAuthenticated = isAuth
    );
  }

  ngOnDestroy(): void {
    // Remove any event listeners
    document.removeEventListener('keydown', this.handleTabKey);
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
    this.currentGiftId = gift.id;
    
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
    if (!id) {
      console.error('Erreur: ID du cadeau non défini');
      return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer ce cadeau ?')) {
      console.log('Suppression du cadeau avec ID:', id);
      this.giftService.deleteGift(id).subscribe({
        next: (response) => {
          console.log('Cadeau supprimé avec succès:', response);
          this.loadGifts();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression du cadeau:', error);
          alert('Erreur lors de la suppression du cadeau. Veuillez réessayer.');
        }
      });
    }
  }

  /**
   * Updates the priorities of all gifts based on their current order
   */
  private updateGiftPriorities(): void {
    this.gifts.forEach((gift, index) => {
      const updatedGift = { ...gift, priority: index };
      this.giftService.updateGift(gift.id, updatedGift).subscribe({
        error: (error) => console.error(`Erreur lors de la mise à jour de la priorité pour ${gift.name}:`, error)
      });
    });
  }
  
  /**
   * Moves a gift up or down in the priority list
   * @param gift The gift to move
   * @param currentIndex The current index of the gift
   * @param direction The direction to move ('up' or 'down')
   */
  moveGiftPosition(gift: any, currentIndex: number, direction: 'up' | 'down'): void {
    // Calculate new index based on direction
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Ensure the new index is within bounds
    if (newIndex < 0 || newIndex >= this.gifts.length) {
      return;
    }
    
    // Reorder the gifts array
    moveItemInArray(this.gifts, currentIndex, newIndex);
    
    // Update the priorities on the backend
    this.updateGiftPriorities();
  }
  
  /**
   * Handle drag and drop reordering of gifts
   */
  drop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.gifts, event.previousIndex, event.currentIndex);
    
    // Update priorities on the backend
    this.updateGiftPriorities();
  }
  
  // Générer des suggestions d'IA avec préférences
  generateAiSuggestions(): void {
    if (!this.aiPrompt.trim()) {
      return;
    }
    
    // Reset reasoning info
    this.resetAiReasoning();
    
    // Build a more detailed prompt with preferences
    let enhancedPrompt = this.aiPrompt;
    
    // Add price range preference
    enhancedPrompt += `. Budget entre ${this.aiMinPrice}€ et ${this.aiMaxPrice}€.`;
    
    // Add likes and dislikes if provided
    if (this.aiPreferences?.trim()) {
      enhancedPrompt += ` J'aime: ${this.aiPreferences}.`;
    }
    
    if (this.aiDislikes?.trim()) {
      enhancedPrompt += ` Je n'aime pas: ${this.aiDislikes}.`;
    }
    
    // Si une catégorie spécifique est sélectionnée, utiliser la méthode dédiée
    if (this.selectedCategory) {
      this.generateCategorySpecificSuggestions(enhancedPrompt);
    } else {
      this.isLoadingAi = true;
      
      // Passer la liste des cadeaux existants à l'IA pour une personnalisation améliorée
      this.giftAiService.generateGiftSuggestions(enhancedPrompt, this.gifts).subscribe({
        next: (data) => {
          this.aiSuggestions = data.suggestions || [];
          
          // Stocker les informations de raisonnement de l'IA
          this.aiAnalysisIntro = data.analysisIntro || '';
          this.aiAnalysisMethod = data.analysisMethod || '';
          this.aiIdentifiedInterests = data.identifiedInterests || [];
          this.showAiReasoning = true;
          
          this.isLoadingAi = false;
          
          // Charger automatiquement les suggestions de catégories à explorer
          if (this.gifts.length > 0) {
            this.loadCategorySuggestions();
          }
        },
        error: (error) => {
          console.error('Erreur lors de la génération de suggestions:', error);
          this.isLoadingAi = false;
        }
      });
    }
  }
  
  /**
   * Réinitialise les informations de raisonnement de l'IA
   */
  resetAiReasoning(): void {
    this.aiAnalysisIntro = '';
    this.aiAnalysisMethod = '';
    this.aiIdentifiedInterests = [];
    this.aiInterestPatterns = '';
    this.showAiReasoning = false;
    this.categoryAnalysisExplanation = '';
    this.showFullAnalysis = false;
    this.expandedSuggestions = [];
  }
  
  /**
   * Charge les suggestions de catégories à explorer
   */
  loadCategorySuggestions(): void {
    this.isLoadingSuggestions = true;
    this.showCategorySuggestions = true;
    
    this.giftAiService.suggestCategoriesToExplore(this.gifts).subscribe({
      next: (data) => {
        this.suggestedCategories = data.suggestedCategories || [];
        this.categoryAnalysisExplanation = data.analysisExplanation || '';
        this.aiInterestPatterns = data.interestPatterns || '';
        this.isLoadingSuggestions = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des suggestions de catégories:', error);
        this.isLoadingSuggestions = false;
      }
    });
  }
  
  /**
   * Génère des suggestions basées sur une catégorie spécifique
   */
  generateCategorySpecificSuggestions(prompt: string): void {
    this.isLoadingAi = true;
    
    this.giftAiService.generateCategorySpecificSuggestions(
      prompt, 
      this.selectedCategory, 
      this.gifts
    ).subscribe({
      next: (data) => {
        this.aiSuggestions = data.suggestions || [];
        this.isLoadingAi = false;
      },
      error: (error) => {
        console.error('Erreur lors de la génération de suggestions par catégorie:', error);
        this.isLoadingAi = false;
      }
    });
  }
  
  /**
   * Sélectionne une catégorie à explorer
   */
  selectCategory(categoryName: string): void {
    this.selectedCategory = categoryName;
    
    // Générer automatiquement des suggestions dans cette catégorie
    // si un prompt est déjà saisi
    if (this.aiPrompt.trim()) {
      // Construire le prompt enrichi
      let enhancedPrompt = this.aiPrompt;
      enhancedPrompt += `. Budget entre ${this.aiMinPrice}€ et ${this.aiMaxPrice}€.`;
      
      if (this.aiPreferences?.trim()) {
        enhancedPrompt += ` J'aime: ${this.aiPreferences}.`;
      }
      
      if (this.aiDislikes?.trim()) {
        enhancedPrompt += ` Je n'aime pas: ${this.aiDislikes}.`;
      }
      
      this.generateCategorySpecificSuggestions(enhancedPrompt);
    }
  }
  
  /**
   * Réinitialise la sélection de catégorie
   */
  resetCategorySelection(): void {
    this.selectedCategory = '';
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

  // Find alternative links for a gift
  findAlternativeLink(giftName: string, pricePoint: any): void {
    // Store current focused element
    this.lastFocusedElement = document.activeElement as HTMLElement;
    
    this.currentSearchItem = giftName + ' ' + pricePoint.label;
    this.currentPricePoint = pricePoint;
    this.alternativeLinks = [];
    this.searchingForLinks = true;
    this.showFindLinkModal = true;
    this.currentGiftId = this.editMode ? this.currentGiftId : null;
    
    // Focus the modal after it becomes visible and setup keyboard trap
    setTimeout(() => {
      if (this.modalContent && this.modalContent.nativeElement) {
        this.modalContent.nativeElement.focus();
        this.setupModalFocusTrap();
      }
    });
    
    // Use AI to find a verified working product link
    this.giftAiService.findProductLinks(giftName, pricePoint).subscribe({
      next: (data) => {
        if (data && data.links && data.links.length > 0) {
          // Transform the link data to include site name in the title if available
          this.alternativeLinks = data.links.map((link: any) => {
            let enrichedTitle = link.title;
            if (link.site) {
              enrichedTitle = `${link.title} (${link.site})`;
            }
            return {
              title: enrichedTitle,
              price: link.price || 'Prix non disponible',
              url: link.url
            };
          });
          
          // If we found a working link, offer to use it immediately
          if (this.alternativeLinks.length === 1 && this.currentGiftId && this.currentPricePoint) {
    setTimeout(() => {
              if (confirm(`Un lien fonctionnel a été trouvé pour "${giftName}".\nVoulez-vous l'ajouter automatiquement à votre liste?`)) {
                this.updateGiftLink(this.alternativeLinks[0].url);
              }
            }, 500);
          }
        } else {
          // Fallback to search links if AI doesn't return specific products
          this.generateFallbackSearchLinks(this.currentSearchItem);
        }
        this.searchingForLinks = false;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche de liens:', error);
        // Fallback to search links in case of error
        this.generateFallbackSearchLinks(this.currentSearchItem);
        this.searchingForLinks = false;
      }
    });
  }
  
  // Generate fallback search links when AI can't find specific products
  private generateFallbackSearchLinks(searchTerm: string): void {
    const searchQuery = encodeURIComponent(searchTerm);
      this.alternativeLinks = [
        {
          url: 'https://www.amazon.fr/s?k=' + searchQuery,
          title: 'Rechercher sur Amazon',
          price: 'Prix variables'
        },
        {
          url: 'https://www.fnac.com/SearchResult/ResultList.aspx?Search=' + searchQuery,
          title: 'Rechercher sur Fnac',
          price: 'Prix variables'
        },
        {
          url: 'https://www.cdiscount.com/search/10/' + searchQuery + '.html',
          title: 'Rechercher sur Cdiscount',
          price: 'Prix variables'
        },
        {
          url: 'https://www.darty.com/nav/recherche?text=' + searchQuery,
          title: 'Rechercher sur Darty',
          price: 'Prix variables'
        }
      ];
  }

  // Setup keyboard trap for the modal
  private setupModalFocusTrap(): void {
    if (!this.modalContent) return;
    
    // Get all focusable elements in the modal
    const modal = this.modalContent.nativeElement;
    this.modalFocusableElements = Array.from(
      modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
    
    // Setup keyboard event to trap focus within modal
    document.addEventListener('keydown', this.handleTabKey);
  }

  // Handle tab key to keep focus within modal
  private handleTabKey = (e: KeyboardEvent): void => {
    if (!this.showFindLinkModal || this.modalFocusableElements.length === 0) return;
    
    // If Tab key is pressed
    if (e.key === 'Tab') {
      const firstFocusableEl = this.modalFocusableElements[0];
      const lastFocusableEl = this.modalFocusableElements[this.modalFocusableElements.length - 1];
      
      // If shift key is pressed with Tab (moving backwards)
      if (e.shiftKey) {
        if (document.activeElement === firstFocusableEl) {
          lastFocusableEl.focus();
          e.preventDefault();
        }
      } else {
        // Tab without shift (moving forwards)
        if (document.activeElement === lastFocusableEl) {
          firstFocusableEl.focus();
          e.preventDefault();
        }
      }
    }
    
    // Only close modal when Escape key is pressed if we want to enable this behavior
    // Commenting out to make modal only close via close button
    // if (e.key === 'Escape') {
    //   this.closeFindLinkModal();
    // }
  };

  // Close the find link modal
  closeFindLinkModal(): void {
    this.showFindLinkModal = false;
    this.alternativeLinks = [];
    this.currentSearchItem = '';
    this.currentPricePoint = null;
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleTabKey);
    
    // Restore focus to the previously focused element
    setTimeout(() => {
      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
        this.lastFocusedElement = null;
      }
    });
  }

  // Update gift link with the selected alternative
  updateGiftLink(linkUrl: string): void {
    if (this.currentPricePoint && this.currentGiftId) {
      // Find the gift and price point to update
      const giftToUpdate = this.gifts.find(g => g.id === this.currentGiftId);
      if (giftToUpdate) {
        const pricePointToUpdate = giftToUpdate.pricePoints.find(
          (p: any) => p.label === this.currentPricePoint.label && 
                      p.price === this.currentPricePoint.price
        );
        
        if (pricePointToUpdate) {
          pricePointToUpdate.link = linkUrl;
          
          // Update in the database
          this.giftService.updateGift(this.currentGiftId, giftToUpdate).subscribe({
            next: () => {
              this.closeFindLinkModal();
              this.loadGifts();
              alert('Lien mis à jour avec succès !');
            },
            error: (error) => {
              console.error('Erreur lors de la mise à jour du lien:', error);
              alert('Erreur lors de la mise à jour du lien. Veuillez réessayer.');
            }
          });
        }
      }
    } else {
      // Just open the link in a new tab without updating
      const validUrl = this.ensureValidUrl(linkUrl);
      window.open(validUrl, '_blank');
      this.closeFindLinkModal();
    }
  }
  
  // Ensure URL has proper protocol
  private ensureValidUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url.replace(/^\/\//, '');
    }
    return url;
  }

  // Open link in new tab with proper URL
  openLink(url: string): void {
    const validUrl = this.ensureValidUrl(url);
    window.open(validUrl, '_blank');
  }

  // Navigate to show login modal
  showLoginModal(): void {
    // Emit an event that can be caught by app.component to show the login modal
    window.dispatchEvent(new CustomEvent('show-login-modal'));
  }
  
  /**
   * Finds cheaper alternatives for an expensive product
   * @param gift The gift containing the expensive product
   * @param pricePoint The specific price point to find alternatives for
   */
  findCheaperAlternatives(gift: any, pricePoint: any): void {
    this.currentGiftForAlternatives = gift;
    this.currentProductName = gift.name;
    this.currentProductOption = pricePoint.label;
    this.currentProductPrice = pricePoint.price;
    this.cheaperAlternatives = [];
    this.loadingCheaperAlternatives = true;
    this.showCheaperAlternativesModal = true;
    
    this.giftAiService.findCheaperAlternatives(gift.name, pricePoint).subscribe({
      next: (data) => {
        if (data && data.alternatives) {
          this.cheaperAlternatives = data.alternatives;
        }
        this.loadingCheaperAlternatives = false;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche d\'alternatives moins chères:', error);
        this.loadingCheaperAlternatives = false;
      }
    });
  }
  
  /**
   * Closes the cheaper alternatives modal
   */
  closeCheaperAlternativesModal(): void {
    this.showCheaperAlternativesModal = false;
    this.cheaperAlternatives = [];
    this.currentProductName = '';
    this.currentProductOption = '';
    this.currentProductPrice = 0;
    this.currentGiftForAlternatives = null;
  }
  
  /**
   * Adds a cheaper alternative to the gift's price points
   * @param alternative The alternative to add
   */
  addCheaperAlternative(alternative: CheaperAlternative): void {
    if (!this.currentGiftForAlternatives) {
      return;
    }
    
    // Add the new alternative to the gift's price points
    const updatedGift = { ...this.currentGiftForAlternatives };
    updatedGift.pricePoints.push({
      label: alternative.label,
      price: alternative.price,
      link: alternative.link
    });
    
    // Sort price points by price
    updatedGift.pricePoints.sort((a: any, b: any) => a.price - b.price);
    
    // Update the gift in the database
    this.giftService.updateGift(updatedGift.id, updatedGift).subscribe({
      next: () => {
        this.closeCheaperAlternativesModal();
        this.loadGifts();
        alert(`Option "${alternative.label}" ajoutée au cadeau "${updatedGift.name}"`);
      },
      error: (error) => {
        console.error('Erreur lors de l\'ajout de l\'alternative:', error);
        alert('Erreur lors de l\'ajout de l\'alternative. Veuillez réessayer.');
      }
    });
  }

  /**
   * Toggles between showing full and summarized AI analysis
   */
  toggleFullAnalysis(): void {
    this.showFullAnalysis = !this.showFullAnalysis;
  }
  
  /**
   * Toggles the expanded details for a specific suggestion
   * @param index The index of the suggestion to toggle
   */
  toggleSuggestionDetails(index: number): void {
    // Initialize array if needed
    if (!this.expandedSuggestions[index]) {
      this.expandedSuggestions[index] = false;
    }
    
    // Toggle the selected suggestion's expanded state
    this.expandedSuggestions[index] = !this.expandedSuggestions[index];
  }
}
