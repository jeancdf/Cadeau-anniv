import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GiftService } from '../services/gift.service';
import { GiftAiService } from '../services/gift-ai.service';
import { AuthService } from '../services/auth.service';

interface PricePoint {
  label: string;
  price: number;
  link: string;
}

interface Gift {
  id: string;
  name: string;
  description?: string;
  priority?: number;
  pricePoints: PricePoint[];
}

interface CheaperAlternative extends PricePoint {
  description: string;
}

type AdminPanel = 'gift' | 'import' | 'ai';
type BudgetFilter = 'all' | 'under-50' | '50-100' | 'over-100';

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
  gifts: Gift[] = [];
  giftForm: FormGroup;
  editMode = false;
  currentGiftId: string | null = null;
  isAuthenticated = false;
  isLoading = false;
  isSaving = false;
  isReordering = false;
  loadError = '';
  actionError = '';
  successMessage = '';

  adminPanel: AdminPanel = 'gift';
  searchQuery = '';
  budgetFilter: BudgetFilter = 'all';
  shareLabel = 'Partager la liste';

  aiPrompt = '';
  aiSuggestions: any[] = [];
  isLoadingAi = false;
  existingListText = '';
  isImportingList = false;
  aiMinPrice = 20;
  aiMaxPrice = 200;
  aiPreferences = '';
  aiDislikes = '';
  aiAnalysisIntro = '';
  aiAnalysisMethod = '';
  aiIdentifiedInterests: string[] = [];
  aiInterestPatterns = '';
  showAiReasoning = false;
  suggestedCategories: any[] = [];
  isLoadingSuggestions = false;
  selectedCategory = '';
  showCategorySuggestions = false;
  categoryAnalysisExplanation = '';
  showFullAnalysis = false;
  expandedSuggestions: boolean[] = [];

  showFindLinkModal = false;
  searchingForLinks = false;
  alternativeLinks: { url: string; title: string; price?: string }[] = [];
  currentSearchItem = '';
  currentPricePoint: PricePoint | null = null;
  currentSearchGiftId: string | null = null;

  showCheaperAlternativesModal = false;
  loadingCheaperAlternatives = false;
  cheaperAlternatives: CheaperAlternative[] = [];
  currentProductName = '';
  currentProductOption = '';
  currentProductPrice = 0;
  currentGiftForAlternatives: Gift | null = null;

  @ViewChild('modalContent') modalContent?: ElementRef<HTMLElement>;
  @ViewChild('editorPanel') editorPanel?: ElementRef<HTMLElement>;

  private lastFocusedElement: HTMLElement | null = null;
  private modalFocusableElements: HTMLElement[] = [];
  private feedbackTimeout: number | null = null;

  constructor(
    private readonly giftService: GiftService,
    private readonly giftAiService: GiftAiService,
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly destroyRef: DestroyRef
  ) {
    this.giftForm = this.createGiftForm();
  }

  ngOnInit(): void {
    this.loadGifts();
    this.authService.isAuthenticated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
      });
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleModalKeydown);
    if (this.feedbackTimeout !== null) {
      window.clearTimeout(this.feedbackTimeout);
    }
  }

  get pricePointsArray(): FormArray {
    return this.giftForm.get('pricePoints') as FormArray;
  }

  get totalOptions(): number {
    return this.gifts.reduce((total, gift) => total + gift.pricePoints.length, 0);
  }

  get hasActiveFilters(): boolean {
    return Boolean(this.searchQuery.trim()) || this.budgetFilter !== 'all';
  }

  get filteredGifts(): Gift[] {
    const query = this.normalizeSearchText(this.searchQuery);

    return this.gifts.filter(gift => {
      const searchableText = this.normalizeSearchText([
        gift.name,
        gift.description || '',
        ...gift.pricePoints.map(point => point.label)
      ].join(' '));
      const matchesSearch = !query || searchableText.includes(query);
      const prices = gift.pricePoints
        .map(point => Number(point.price))
        .filter(price => Number.isFinite(price));

      const matchesBudget = this.budgetFilter === 'all'
        || (this.budgetFilter === 'under-50' && prices.some(price => price < 50))
        || (this.budgetFilter === '50-100' && prices.some(price => price >= 50 && price <= 100))
        || (this.budgetFilter === 'over-100' && prices.some(price => price > 100));

      return matchesSearch && matchesBudget;
    });
  }

  loadGifts(successMessage = ''): void {
    this.isLoading = true;
    this.loadError = '';

    this.giftService.getGifts()
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: data => {
          const gifts = Array.isArray(data) ? data : [];
          this.gifts = gifts.map((gift, index) => this.normalizeGift(gift, index));
          if (successMessage) {
            this.showSuccess(successMessage);
          }
        },
        error: () => {
          this.loadError = 'La liste est momentanément indisponible. Vérifiez la connexion au serveur puis réessayez.';
        }
      });
  }

  createGiftForm(withInitialOption = true): FormGroup {
    const form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      description: ['', Validators.maxLength(500)],
      pricePoints: this.fb.array([], Validators.minLength(1))
    });

    if (withInitialOption) {
      (form.get('pricePoints') as FormArray).push(this.createPricePointForm());
    }

    return form;
  }

  private createPricePointForm(point?: Partial<PricePoint>): FormGroup {
    return this.fb.group({
      label: [point?.label || '', [Validators.required, Validators.maxLength(80)]],
      price: [point?.price ?? null, [Validators.required, Validators.min(0)]],
      link: [point?.link || '', Validators.required]
    });
  }

  addPricePoint(): void {
    this.pricePointsArray.push(this.createPricePointForm());
  }

  removePricePoint(index: number): void {
    if (this.pricePointsArray.length === 1) {
      this.actionError = 'Un cadeau doit conserver au moins une option.';
      return;
    }
    this.pricePointsArray.removeAt(index);
  }

  onSubmit(): void {
    this.clearFeedback();
    if (this.giftForm.invalid) {
      this.giftForm.markAllAsTouched();
      this.actionError = 'Complétez le nom et chaque option avant d’enregistrer.';
      return;
    }

    const rawValue = this.giftForm.getRawValue();
    const pricePoints: PricePoint[] = rawValue.pricePoints.map((point: PricePoint) => ({
      label: String(point.label).trim(),
      price: Number(point.price),
      link: this.safeGiftUrl(point.link) || ''
    }));

    if (pricePoints.some(point => !point.link)) {
      this.actionError = 'Chaque lien doit être une adresse web valide.';
      return;
    }

    pricePoints.sort((first, second) => first.price - second.price);
    const existingGift = this.gifts.find(gift => gift.id === this.currentGiftId);
    const giftData = {
      name: String(rawValue.name).trim(),
      description: String(rawValue.description || '').trim(),
      priority: existingGift?.priority ?? this.gifts.length,
      pricePoints
    };

    this.isSaving = true;
    const request = this.editMode && this.currentGiftId
      ? this.giftService.updateGift(this.currentGiftId, giftData)
      : this.giftService.addGift(giftData);
    const successMessage = this.editMode ? 'Le cadeau a bien été mis à jour.' : 'Le cadeau a rejoint la liste.';

    request.pipe(finalize(() => {
      this.isSaving = false;
    })).subscribe({
      next: () => {
        this.resetForm();
        this.loadGifts(successMessage);
      },
      error: () => {
        this.actionError = 'Impossible d’enregistrer ce cadeau pour le moment.';
      }
    });
  }

  resetForm(): void {
    this.giftForm = this.createGiftForm();
    this.editMode = false;
    this.currentGiftId = null;
    this.clearFeedback();
  }

  editGift(gift: Gift): void {
    this.adminPanel = 'gift';
    this.editMode = true;
    this.currentGiftId = gift.id;
    this.giftForm = this.createGiftForm(false);
    this.giftForm.patchValue({
      name: gift.name,
      description: gift.description || ''
    });

    const pricePoints = gift.pricePoints.length ? gift.pricePoints : [{}];
    pricePoints.forEach(point => {
      this.pricePointsArray.push(this.createPricePointForm(point));
    });

    window.setTimeout(() => {
      this.editorPanel?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  deleteGift(id: string): void {
    if (!id || !window.confirm('Supprimer définitivement ce cadeau de la liste ?')) {
      return;
    }

    this.clearFeedback();
    this.giftService.deleteGift(id).subscribe({
      next: () => this.loadGifts('Le cadeau a été supprimé.'),
      error: () => {
        this.actionError = 'La suppression a échoué. Réessayez dans un instant.';
      }
    });
  }

  moveGiftPosition(currentIndex: number, direction: 'up' | 'down'): void {
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= this.gifts.length || this.hasActiveFilters || this.isReordering) {
      return;
    }

    const previousOrder = [...this.gifts];
    moveItemInArray(this.gifts, currentIndex, newIndex);
    this.persistGiftPriorities(previousOrder);
  }

  drop(event: CdkDragDrop<Gift[]>): void {
    if (event.previousIndex === event.currentIndex || this.hasActiveFilters || this.isReordering) {
      return;
    }

    const previousOrder = [...this.gifts];
    moveItemInArray(this.gifts, event.previousIndex, event.currentIndex);
    this.persistGiftPriorities(previousOrder);
  }

  private persistGiftPriorities(previousOrder: Gift[]): void {
    const priorities = this.gifts.map((gift, priority) => ({ id: gift.id, priority }));
    this.isReordering = true;
    this.clearFeedback();

    this.giftService.reorderGifts(priorities)
      .pipe(finalize(() => {
        this.isReordering = false;
      }))
      .subscribe({
        next: () => {
          this.gifts = this.gifts.map((gift, priority) => ({ ...gift, priority }));
          this.showSuccess('Le nouvel ordre a été enregistré.');
        },
        error: () => {
          this.gifts = previousOrder;
          this.actionError = 'Le nouvel ordre n’a pas pu être enregistré.';
        }
      });
  }

  setBudgetFilter(filter: BudgetFilter): void {
    this.budgetFilter = filter;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.budgetFilter = 'all';
  }

  selectAdminPanel(panel: AdminPanel): void {
    this.adminPanel = panel;
    this.clearFeedback();
  }

  getGiftPriceLabel(gift: Gift): string {
    const prices = gift.pricePoints
      .map(point => Number(point.price))
      .filter(price => Number.isFinite(price));
    if (!prices.length) {
      return 'Prix à préciser';
    }

    const minimum = Math.min(...prices);
    const maximum = Math.max(...prices);
    return minimum === maximum ? `${minimum} €` : `${minimum}–${maximum} €`;
  }

  trackByGiftId(_index: number, gift: Gift): string {
    return gift.id;
  }

  async shareList(): Promise<void> {
    const shareData = {
      title: 'Ma liste de souhaits',
      text: 'Voici ma liste de souhaits pour trouver le cadeau juste.',
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        this.shareLabel = 'Liste partagée';
      } else {
        await this.copyText(shareData.url);
        this.shareLabel = 'Lien copié !';
      }
      this.resetShareLabel();
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        this.actionError = 'Impossible de copier le lien automatiquement.';
      }
    }
  }

  private async copyText(value: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    textArea.remove();
    if (!copied) {
      throw new Error('Copy failed');
    }
  }

  private resetShareLabel(): void {
    window.setTimeout(() => {
      this.shareLabel = 'Partager la liste';
    }, 2200);
  }

  generateAiSuggestions(): void {
    if (!this.aiPrompt.trim()) {
      return;
    }

    this.clearFeedback();
    this.resetAiReasoning();
    const minimum = Math.min(this.aiMinPrice, this.aiMaxPrice);
    const maximum = Math.max(this.aiMinPrice, this.aiMaxPrice);
    this.aiMinPrice = minimum;
    this.aiMaxPrice = maximum;
    let enhancedPrompt = `${this.aiPrompt.trim()}. Budget entre ${minimum}€ et ${maximum}€.`;

    if (this.aiPreferences.trim()) {
      enhancedPrompt += ` J’aime : ${this.aiPreferences.trim()}.`;
    }
    if (this.aiDislikes.trim()) {
      enhancedPrompt += ` Je n’aime pas : ${this.aiDislikes.trim()}.`;
    }

    if (this.selectedCategory) {
      this.generateCategorySpecificSuggestions(enhancedPrompt);
      return;
    }

    this.isLoadingAi = true;
    this.giftAiService.generateGiftSuggestions(enhancedPrompt, this.gifts)
      .pipe(finalize(() => {
        this.isLoadingAi = false;
      }))
      .subscribe({
        next: data => {
          this.aiSuggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
          this.aiAnalysisIntro = data?.analysisIntro || '';
          this.aiAnalysisMethod = data?.analysisMethod || '';
          this.aiIdentifiedInterests = Array.isArray(data?.identifiedInterests) ? data.identifiedInterests : [];
          this.showAiReasoning = true;
          if (this.gifts.length > 0) {
            this.loadCategorySuggestions();
          }
        },
        error: () => {
          this.actionError = 'L’atelier IA n’a pas répondu. Vérifiez sa configuration puis réessayez.';
        }
      });
  }

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

  loadCategorySuggestions(): void {
    this.isLoadingSuggestions = true;
    this.showCategorySuggestions = true;
    this.giftAiService.suggestCategoriesToExplore(this.gifts)
      .pipe(finalize(() => {
        this.isLoadingSuggestions = false;
      }))
      .subscribe({
        next: data => {
          this.suggestedCategories = Array.isArray(data?.suggestedCategories) ? data.suggestedCategories : [];
          this.categoryAnalysisExplanation = data?.analysisExplanation || '';
          this.aiInterestPatterns = data?.interestPatterns || '';
        },
        error: () => {
          this.actionError = 'Les catégories complémentaires n’ont pas pu être générées.';
        }
      });
  }

  generateCategorySpecificSuggestions(prompt: string): void {
    this.isLoadingAi = true;
    this.giftAiService.generateCategorySpecificSuggestions(prompt, this.selectedCategory, this.gifts)
      .pipe(finalize(() => {
        this.isLoadingAi = false;
      }))
      .subscribe({
        next: data => {
          this.aiSuggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
        },
        error: () => {
          this.actionError = 'Aucune suggestion n’a pu être générée dans cette catégorie.';
        }
      });
  }

  selectCategory(categoryName: string): void {
    this.selectedCategory = categoryName;
    if (this.aiPrompt.trim()) {
      this.generateAiSuggestions();
    }
  }

  resetCategorySelection(): void {
    this.selectedCategory = '';
  }

  addAiSuggestion(suggestion: any): void {
    const giftData = {
      name: suggestion?.name,
      description: suggestion?.description || '',
      pricePoints: Array.isArray(suggestion?.pricePoints) ? suggestion.pricePoints : [],
      priority: this.gifts.length
    };

    this.giftService.addGift(giftData).subscribe({
      next: () => this.loadGifts('La suggestion a été ajoutée à la liste.'),
      error: () => {
        this.actionError = 'La suggestion n’a pas pu être ajoutée.';
      }
    });
  }

  exportList(): void {
    this.giftService.exportGifts().subscribe({
      next: data => this.giftService.downloadGiftsAsJson(data),
      error: () => {
        this.actionError = 'L’export de la liste a échoué.';
      }
    });
  }

  importExistingList(): void {
    if (!this.existingListText.trim()) {
      return;
    }

    this.clearFeedback();
    this.isImportingList = true;
    this.giftAiService.importExistingGiftList(this.existingListText).subscribe({
      next: data => {
        const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
        if (!suggestions.length) {
          this.isImportingList = false;
          this.actionError = 'Aucun cadeau exploitable n’a été trouvé dans ce texte.';
          return;
        }

        let addedCount = 0;
        let failedCount = 0;
        const addNextGift = (index: number): void => {
          if (index >= suggestions.length) {
            this.isImportingList = false;
            this.existingListText = '';
            const message = `${addedCount} cadeau${addedCount > 1 ? 'x' : ''} importé${addedCount > 1 ? 's' : ''}.`;
            this.loadGifts(message);
            if (failedCount) {
              this.actionError = `${failedCount} élément${failedCount > 1 ? 's' : ''} n’ont pas pu être importés.`;
            }
            return;
          }

          const gift = { ...suggestions[index], priority: this.gifts.length + index };
          this.giftService.addGift(gift).subscribe({
            next: () => {
              addedCount += 1;
              addNextGift(index + 1);
            },
            error: () => {
              failedCount += 1;
              addNextGift(index + 1);
            }
          });
        };

        addNextGift(0);
      },
      error: () => {
        this.isImportingList = false;
        this.actionError = 'La liste n’a pas pu être analysée par l’IA.';
      }
    });
  }

  findAlternativeLink(gift: Gift, pricePoint: PricePoint): void {
    this.lastFocusedElement = document.activeElement as HTMLElement;
    this.currentSearchItem = `${gift.name} ${pricePoint.label}`;
    this.currentPricePoint = pricePoint;
    this.currentSearchGiftId = gift.id;
    this.alternativeLinks = [];
    this.searchingForLinks = true;
    this.showFindLinkModal = true;

    window.setTimeout(() => {
      this.modalContent?.nativeElement.focus();
      this.setupModalFocusTrap();
    });

    this.giftAiService.findProductLinks(gift.name, pricePoint)
      .pipe(finalize(() => {
        this.searchingForLinks = false;
      }))
      .subscribe({
        next: data => {
          if (Array.isArray(data?.links) && data.links.length > 0) {
            this.alternativeLinks = data.links.map((link: any) => ({
              title: link.site ? `${link.title} · ${link.site}` : link.title,
              price: link.price || 'Prix non disponible',
              url: link.url
            }));
          } else {
            this.generateFallbackSearchLinks(this.currentSearchItem);
          }
        },
        error: () => this.generateFallbackSearchLinks(this.currentSearchItem)
      });
  }

  private generateFallbackSearchLinks(searchTerm: string): void {
    const searchQuery = encodeURIComponent(searchTerm);
    this.alternativeLinks = [
      { url: `https://www.amazon.fr/s?k=${searchQuery}`, title: 'Rechercher sur Amazon', price: 'Prix variables' },
      { url: `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${searchQuery}`, title: 'Rechercher sur Fnac', price: 'Prix variables' },
      { url: `https://www.cdiscount.com/search/10/${searchQuery}.html`, title: 'Rechercher sur Cdiscount', price: 'Prix variables' },
      { url: `https://www.darty.com/nav/recherche?text=${searchQuery}`, title: 'Rechercher sur Darty', price: 'Prix variables' }
    ];
  }

  private setupModalFocusTrap(): void {
    const modal = this.modalContent?.nativeElement;
    if (!modal) {
      return;
    }
    this.modalFocusableElements = Array.from(modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
    document.addEventListener('keydown', this.handleModalKeydown);
  }

  private handleModalKeydown = (event: KeyboardEvent): void => {
    if (!this.showFindLinkModal) {
      return;
    }
    if (event.key === 'Escape') {
      this.closeFindLinkModal();
      return;
    }
    if (event.key !== 'Tab' || !this.modalFocusableElements.length) {
      return;
    }

    const firstElement = this.modalFocusableElements[0];
    const lastElement = this.modalFocusableElements[this.modalFocusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      lastElement.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      firstElement.focus();
      event.preventDefault();
    }
  };

  closeFindLinkModal(): void {
    this.showFindLinkModal = false;
    this.alternativeLinks = [];
    this.currentSearchItem = '';
    this.currentPricePoint = null;
    this.currentSearchGiftId = null;
    document.removeEventListener('keydown', this.handleModalKeydown);

    window.setTimeout(() => {
      this.lastFocusedElement?.focus();
      this.lastFocusedElement = null;
    });
  }

  updateGiftLink(linkUrl: string): void {
    const validUrl = this.safeGiftUrl(linkUrl);
    if (!validUrl) {
      this.actionError = 'Le lien proposé n’est pas une adresse valide.';
      return;
    }

    if (!this.currentPricePoint || !this.currentSearchGiftId) {
      window.open(validUrl, '_blank', 'noopener,noreferrer');
      this.closeFindLinkModal();
      return;
    }

    const giftToUpdate = this.gifts.find(gift => gift.id === this.currentSearchGiftId);
    if (!giftToUpdate) {
      this.actionError = 'Le cadeau à mettre à jour est introuvable.';
      this.closeFindLinkModal();
      return;
    }

    const pricePoints = giftToUpdate.pricePoints.map(point => (
      point.label === this.currentPricePoint?.label && point.price === this.currentPricePoint?.price
        ? { ...point, link: validUrl }
        : { ...point }
    ));
    const updatedGift = { ...giftToUpdate, pricePoints };

    this.giftService.updateGift(giftToUpdate.id, updatedGift).subscribe({
      next: () => {
        this.closeFindLinkModal();
        this.loadGifts('Le lien de l’option a été mis à jour.');
      },
      error: () => {
        this.actionError = 'Le nouveau lien n’a pas pu être enregistré.';
      }
    });
  }

  safeGiftUrl(url?: string | null): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      const normalizedUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      const parsedUrl = new URL(normalizedUrl);
      return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.toString() : null;
    } catch {
      return null;
    }
  }

  showLoginModal(): void {
    window.dispatchEvent(new CustomEvent('show-login-modal'));
  }

  findCheaperAlternatives(gift: Gift, pricePoint: PricePoint): void {
    this.currentGiftForAlternatives = gift;
    this.currentProductName = gift.name;
    this.currentProductOption = pricePoint.label;
    this.currentProductPrice = Number(pricePoint.price);
    this.cheaperAlternatives = [];
    this.loadingCheaperAlternatives = true;
    this.showCheaperAlternativesModal = true;

    this.giftAiService.findCheaperAlternatives(gift.name, pricePoint)
      .pipe(finalize(() => {
        this.loadingCheaperAlternatives = false;
      }))
      .subscribe({
        next: data => {
          this.cheaperAlternatives = Array.isArray(data?.alternatives) ? data.alternatives : [];
        },
        error: () => {
          this.actionError = 'La recherche d’alternatives moins chères a échoué.';
        }
      });
  }

  closeCheaperAlternativesModal(): void {
    this.showCheaperAlternativesModal = false;
    this.cheaperAlternatives = [];
    this.currentProductName = '';
    this.currentProductOption = '';
    this.currentProductPrice = 0;
    this.currentGiftForAlternatives = null;
  }

  addCheaperAlternative(alternative: CheaperAlternative): void {
    if (!this.currentGiftForAlternatives) {
      return;
    }

    const updatedGift: Gift = {
      ...this.currentGiftForAlternatives,
      pricePoints: [
        ...this.currentGiftForAlternatives.pricePoints.map(point => ({ ...point })),
        {
          label: alternative.label,
          price: Number(alternative.price),
          link: this.safeGiftUrl(alternative.link) || alternative.link
        }
      ].sort((first, second) => first.price - second.price)
    };

    this.giftService.updateGift(updatedGift.id, updatedGift).subscribe({
      next: () => {
        this.closeCheaperAlternativesModal();
        this.loadGifts(`L’option « ${alternative.label} » a été ajoutée.`);
      },
      error: () => {
        this.actionError = 'Cette alternative n’a pas pu être ajoutée.';
      }
    });
  }

  toggleFullAnalysis(): void {
    this.showFullAnalysis = !this.showFullAnalysis;
  }

  toggleSuggestionDetails(index: number): void {
    this.expandedSuggestions[index] = !this.expandedSuggestions[index];
  }

  private normalizeGift(rawGift: any, index: number): Gift {
    return {
      ...rawGift,
      id: String(rawGift?.id || index),
      name: String(rawGift?.name || 'Cadeau sans nom'),
      description: rawGift?.description ? String(rawGift.description) : '',
      priority: Number.isFinite(Number(rawGift?.priority)) ? Number(rawGift.priority) : index,
      pricePoints: Array.isArray(rawGift?.pricePoints)
        ? rawGift.pricePoints.map((point: any) => ({
          label: String(point?.label || 'Option'),
          price: Number.isFinite(Number(point?.price)) ? Number(point.price) : 0,
          link: String(point?.link || '')
        })).sort((first: PricePoint, second: PricePoint) => first.price - second.price)
        : []
    };
  }

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    if (this.feedbackTimeout !== null) {
      window.clearTimeout(this.feedbackTimeout);
    }
    this.feedbackTimeout = window.setTimeout(() => {
      this.successMessage = '';
      this.feedbackTimeout = null;
    }, 3500);
  }

  private clearFeedback(): void {
    this.actionError = '';
    this.successMessage = '';
  }
}
