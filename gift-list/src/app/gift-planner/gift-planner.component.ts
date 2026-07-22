import {
  AfterViewChecked,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  GiftPlannerService,
  PlannerChatResponse,
  PlannerConversationMessage,
  PlannerGiftSuggestion,
  PlannerProfile
} from '../services/gift-planner.service';
import { SharedListPayload, SharedListService } from '../services/shared-list.service';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';
import { AccountAccessComponent } from '../components/account-access/account-access.component';
import { AccountService } from '../services/account.service';
import { PLANNER_STORAGE_KEY } from './planner-storage';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type PlannerStage = 'audience' | 'occasion' | 'start' | 'chat';

interface Choice<T extends string> {
  value: T;
  icon: string;
  label: string;
  description: string;
}

interface ChatMessage extends PlannerConversationMessage {
  id: number;
  suggestions?: PlannerGiftSuggestion[];
  quickReplies?: string[];
}

interface SavedPlannerState {
  stage: PlannerStage;
  profile: Partial<PlannerProfile>;
  messages: ChatMessage[];
  selectedGifts: PlannerGiftSuggestion[];
  profileSummary: string;
  sharedSlug?: string;
  sharedTitle?: string;
}

@Component({
  selector: 'app-gift-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, ThemeToggleComponent, AccountAccessComponent],
  templateUrl: './gift-planner.component.html',
  styleUrl: './gift-planner.component.css'
})
export class GiftPlannerComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageList') private messageList?: ElementRef<HTMLElement>;
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLTextAreaElement>;

  readonly plannerSteps = [
    { number: 1, label: 'Pour qui' },
    { number: 2, label: 'Occasion' },
    { number: 3, label: 'Démarrage' }
  ];

  readonly audienceChoices: Choice<'self' | 'other'>[] = [
    {
      value: 'self',
      icon: 'bi-person-heart',
      label: 'Pour moi',
      description: 'Je construis une liste qui me ressemble.'
    },
    {
      value: 'other',
      icon: 'bi-people',
      label: 'Pour quelqu’un d’autre',
      description: 'Je cherche les bonnes idées pour un proche.'
    }
  ];

  readonly occasionChoices: Choice<string>[] = [
    { value: 'anniversaire', icon: 'bi-balloon', label: 'Anniversaire', description: 'Pour marquer une nouvelle année.' },
    { value: 'noel', icon: 'bi-snow2', label: 'Noël', description: 'Une liste pour les fêtes.' },
    { value: 'mariage', icon: 'bi-hearts', label: 'Mariage', description: 'Pour célébrer un nouveau chapitre.' },
    { value: 'naissance', icon: 'bi-stars', label: 'Naissance', description: 'Pour accueillir un nouveau venu.' },
    { value: 'aucune', icon: 'bi-gift', label: 'Juste pour faire plaisir', description: 'Aucune occasion particulière.' },
    { value: 'autre', icon: 'bi-three-dots', label: 'Une autre occasion', description: 'On la précisera dans la conversation.' }
  ];

  readonly startChoices: Choice<PlannerProfile['startMode']>[] = [
    {
      value: 'ideas',
      icon: 'bi-lightbulb',
      label: 'J’ai quelques idées',
      description: 'Je les donne à l’IA pour les développer.'
    },
    {
      value: 'describe',
      icon: 'bi-chat-heart',
      label: 'Je veux décrire la personne',
      description: 'Je raconte ce que je sais, librement.'
    },
    {
      value: 'guide',
      icon: 'bi-signpost-split',
      label: 'Pose-moi des questions',
      description: 'L’IA mène la conversation pas à pas.'
    },
    {
      value: 'surprise',
      icon: 'bi-magic',
      label: 'Je pars de zéro',
      description: 'L’IA m’aide à trouver la première piste.'
    }
  ];

  stage: PlannerStage = 'audience';
  profile: Partial<PlannerProfile> = {};
  messages: ChatMessage[] = [];
  selectedGifts: PlannerGiftSuggestion[] = [];
  profileSummary = '';
  draftMessage = '';
  isThinking = false;
  isMobileListOpen = false;
  errorMessage = '';
  shareLabel = 'Partager';
  editingGiftIndex: number | null = null;
  giftDraft: PlannerGiftSuggestion | null = null;
  isLoadingPreview = false;
  enrichmentError = '';
  imagePreviewFailed = false;
  showRestartModal = false;
  showShareModal = false;
  shareTitle = '';
  shareSlug = '';
  shareSlugTouched = false;
  isPublishing = false;
  publishError = '';
  publishedUrl = '';
  currentSharedSlug = '';
  currentSharedTitle = '';
  isLoadingSavedList = false;

  private nextMessageId = 1;
  private shouldScroll = false;

  constructor(
    private readonly plannerService: GiftPlannerService,
    private readonly sharedListService: SharedListService,
    readonly accountService: AccountService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {
    this.restoreState();
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const slug = String(params.get('edit') || '').trim();
        if (slug) {
          this.loadSavedList(slug);
        }
      });
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScroll || !this.messageList) {
      return;
    }

    this.messageList.nativeElement.scrollTo({
      top: this.messageList.nativeElement.scrollHeight,
      behavior: 'smooth'
    });
    this.shouldScroll = false;
  }

  get stepNumber(): number {
    return this.stage === 'audience' ? 1 : this.stage === 'occasion' ? 2 : 3;
  }

  get occasionLabel(): string {
    return this.occasionChoices.find(choice => choice.value === this.profile.occasion)?.label || '';
  }

  get audienceLabel(): string {
    return this.profile.audience === 'self' ? 'Pour moi' : 'Pour un proche';
  }

  get canSend(): boolean {
    return Boolean(this.draftMessage.trim()) && !this.isThinking;
  }

  selectAudience(audience: 'self' | 'other'): void {
    this.profile.audience = audience;
    this.stage = 'occasion';
    this.persistState();
  }

  selectOccasion(occasion: string): void {
    this.profile.occasion = occasion;
    this.stage = 'start';
    this.persistState();
  }

  selectStartMode(startMode: PlannerProfile['startMode']): void {
    this.profile.startMode = startMode;
    this.stage = 'chat';
    this.messages = [];
    this.errorMessage = '';

    if (startMode === 'guide' || startMode === 'surprise') {
      const request = startMode === 'guide'
        ? 'Pose-moi des questions, une par une, pour construire la meilleure liste possible.'
        : 'Je pars de zéro. Aide-moi à découvrir de bonnes idées en me guidant.';
      this.addMessage('user', request);
      this.requestAssistant();
      return;
    }

    const intro = startMode === 'ideas'
      ? 'Parfait. Donne-moi tes premières idées, même si elles sont vagues : je vais les développer avec toi.'
      : this.profile.audience === 'self'
        ? 'Raconte-moi librement ce que tu aimes, ce qui te ferait plaisir ou ce que tu veux éviter.'
        : 'Décris-moi cette personne comme tu le ferais à un ami : ses goûts, ses habitudes ou ce qu’elle possède déjà.';
    this.addMessage('assistant', intro);
    this.focusComposer();
    this.persistState();
  }

  goBack(): void {
    if (this.stage === 'occasion') {
      this.stage = 'audience';
      delete this.profile.audience;
    } else if (this.stage === 'start') {
      this.stage = 'occasion';
      delete this.profile.occasion;
    }
    this.persistState();
  }

  sendMessage(content = this.draftMessage): void {
    const cleanContent = content.trim();
    if (!cleanContent || this.isThinking) {
      return;
    }

    this.draftMessage = '';
    this.errorMessage = '';
    this.addMessage('user', cleanContent);
    this.requestAssistant();
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.sendMessage();
  }

  useQuickReply(reply: string): void {
    this.sendMessage(reply);
  }

  askToBeGuided(): void {
    this.sendMessage('Je ne sais pas quoi ajouter. Pose-moi une question pour mieux comprendre ce qui conviendrait.');
  }

  addGift(suggestion: PlannerGiftSuggestion): void {
    if (this.isGiftSelected(suggestion)) {
      return;
    }

    this.selectedGifts = [...this.selectedGifts, suggestion];
    this.persistState();
  }

  rejectGift(suggestion: PlannerGiftSuggestion): void {
    this.sendMessage(`L’idée « ${suggestion.name} » ne me convient pas. Propose-moi une autre piste et demande-moi pourquoi si cela peut t’aider.`);
  }

  removeGift(index: number): void {
    this.selectedGifts = this.selectedGifts.filter((_, giftIndex) => giftIndex !== index);
    if (this.editingGiftIndex === index) {
      this.closeGiftEditor();
    } else if (this.editingGiftIndex !== null && this.editingGiftIndex > index) {
      this.editingGiftIndex -= 1;
    }
    this.persistState();
  }

  toggleMobileList(): void {
    this.isMobileListOpen = !this.isMobileListOpen;
  }

  isGiftSelected(suggestion: PlannerGiftSuggestion): boolean {
    const normalizedName = suggestion.name.trim().toLocaleLowerCase('fr');
    return this.selectedGifts.some(gift => gift.name.trim().toLocaleLowerCase('fr') === normalizedName);
  }

  refineGift(gift: PlannerGiftSuggestion): void {
    this.draftMessage = `Affinons l’idée « ${gift.name} ». `;
    this.focusComposer();
  }

  openGiftEditor(index: number): void {
    const gift = this.selectedGifts[index];
    if (!gift) {
      return;
    }
    this.editingGiftIndex = index;
    this.giftDraft = {
      ...gift,
      productUrl: gift.productUrl || '',
      imageUrl: gift.imageUrl || ''
    };
    this.enrichmentError = '';
    this.imagePreviewFailed = false;
  }

  closeGiftEditor(): void {
    this.editingGiftIndex = null;
    this.giftDraft = null;
    this.enrichmentError = '';
    this.imagePreviewFailed = false;
  }

  loadProductPreview(): void {
    const productUrl = this.giftDraft?.productUrl?.trim();
    if (!this.giftDraft || !productUrl || this.isLoadingPreview) {
      return;
    }

    this.isLoadingPreview = true;
    this.enrichmentError = '';
    this.sharedListService.previewProduct(productUrl).pipe(
      finalize(() => {
        this.isLoadingPreview = false;
      })
    ).subscribe({
      next: preview => {
        if (!this.giftDraft) {
          return;
        }
        this.giftDraft.productUrl = preview.productUrl;
        this.giftDraft.name = this.giftDraft.name.trim() || preview.title || this.giftDraft.name;
        if (!this.giftDraft.imageUrl && preview.imageUrl) {
          this.giftDraft.imageUrl = preview.imageUrl;
        }
        this.imagePreviewFailed = false;
        if (!preview.imageUrl) {
          this.enrichmentError = 'Aucune image détectée. Vous pouvez coller une URL d’image manuellement.';
        }
      },
      error: error => {
        this.enrichmentError = error?.error?.message || 'Impossible de récupérer l’aperçu de ce produit.';
      }
    });
  }

  saveGiftEditor(): void {
    if (this.editingGiftIndex === null || !this.giftDraft) {
      return;
    }

    const name = this.giftDraft.name.trim();
    if (!name) {
      this.enrichmentError = 'Le cadeau doit conserver un nom.';
      return;
    }
    if (!this.isValidOptionalUrl(this.giftDraft.productUrl) || !this.isValidOptionalUrl(this.giftDraft.imageUrl)) {
      this.enrichmentError = 'Les liens doivent être des adresses HTTP(S) valides.';
      return;
    }

    this.selectedGifts = this.selectedGifts.map((gift, index) => index === this.editingGiftIndex
      ? {
          ...gift,
          ...this.giftDraft,
          name,
          description: this.giftDraft?.description.trim() || '',
          reason: this.giftDraft?.reason.trim() || '',
          budgetLabel: this.giftDraft?.budgetLabel.trim() || '',
          productUrl: this.giftDraft?.productUrl?.trim() || '',
          imageUrl: this.giftDraft?.imageUrl?.trim() || ''
        }
      : gift);
    this.closeGiftEditor();
    this.persistState();
  }

  trackMessage(_: number, message: ChatMessage): number {
    return message.id;
  }

  trackGift(index: number, gift: PlannerGiftSuggestion): string {
    return `${gift.name}-${index}`;
  }

  restart(): void {
    if (this.stage === 'chat' && (this.messages.length || this.selectedGifts.length)) {
      this.showRestartModal = true;
      return;
    }

    this.resetPlanner();
  }

  cancelRestart(): void {
    this.showRestartModal = false;
  }

  confirmRestart(): void {
    this.resetPlanner();
  }

  private resetPlanner(): void {
    this.showRestartModal = false;
    this.stage = 'audience';
    this.profile = {};
    this.messages = [];
    this.selectedGifts = [];
    this.profileSummary = '';
    this.draftMessage = '';
    this.errorMessage = '';
    this.isMobileListOpen = false;
    this.currentSharedSlug = '';
    this.currentSharedTitle = '';
    this.closeGiftEditor();
    this.closeShareModal();
    this.nextMessageId = 1;
    localStorage.removeItem(PLANNER_STORAGE_KEY);
    if (this.route.snapshot.queryParamMap.has('edit')) {
      void this.router.navigate(['/creer'], { replaceUrl: true });
    }
  }

  shareDraft(): void {
    if (!this.selectedGifts.length) {
      return;
    }

    this.showShareModal = true;
    this.publishError = '';
    this.publishedUrl = '';
    this.shareTitle = this.currentSharedTitle || `Ma liste — ${this.occasionLabel || 'Mes idées cadeaux'}`;
    this.shareSlug = this.currentSharedSlug || this.normalizeSlug(this.shareTitle);
    this.shareSlugTouched = Boolean(this.currentSharedSlug);
  }

  updateShareTitle(value: string): void {
    this.shareTitle = value;
    if (!this.shareSlugTouched && !this.currentSharedSlug) {
      this.shareSlug = this.normalizeSlug(value);
    }
  }

  updateShareSlug(value: string): void {
    this.shareSlugTouched = true;
    this.shareSlug = this.normalizeSlug(value);
  }

  closeShareModal(): void {
    if (this.isPublishing) {
      return;
    }
    this.showShareModal = false;
    this.publishError = '';
    this.publishedUrl = '';
  }

  publishList(): void {
    const title = this.shareTitle.trim();
    const slug = this.normalizeSlug(this.shareSlug);
    if (!title) {
      this.publishError = 'Donnez un titre à la liste.';
      return;
    }
    if (slug.length < 3) {
      this.publishError = 'Le lien personnalisé doit contenir au moins 3 caractères.';
      return;
    }
    const payload: SharedListPayload = {
      title,
      occasion: this.occasionLabel,
      audienceLabel: this.audienceLabel,
      gifts: this.selectedGifts.map(gift => ({
        name: gift.name,
        description: gift.description || '',
        reason: gift.reason || '',
        budgetLabel: gift.budgetLabel || '',
        productUrl: gift.productUrl || '',
        imageUrl: gift.imageUrl || ''
      }))
    };
    const request = this.currentSharedSlug
      ? this.sharedListService.updateSharedList(this.currentSharedSlug, payload)
      : this.sharedListService.createSharedList({ ...payload, slug });

    this.isPublishing = true;
    this.publishError = '';
    request.pipe(finalize(() => {
      this.isPublishing = false;
    })).subscribe({
      next: response => {
        this.currentSharedSlug = response.list.slug;
        this.currentSharedTitle = response.list.title;
        this.shareSlug = response.list.slug;
        this.shareTitle = response.list.title;
        this.publishedUrl = this.sharedListService.getPublicUrl(response.list.slug);
        this.persistState();
      },
      error: error => {
        this.publishError = error?.error?.message || 'Impossible de publier cette liste pour le moment.';
      }
    });
  }

  async sharePublishedLink(): Promise<void> {
    if (!this.publishedUrl) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: this.shareTitle, url: this.publishedUrl });
        this.shareLabel = 'Lien partagé !';
      } else {
        await this.copyPublishedLink();
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        this.publishError = 'Impossible de partager le lien. Vous pouvez le copier manuellement.';
      }
    }
  }

  async copyPublishedLink(): Promise<void> {
    if (!this.publishedUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(this.publishedUrl);
      this.shareLabel = 'Lien copié !';
      window.setTimeout(() => this.shareLabel = 'Partager', 2200);
    } catch {
      this.publishError = 'La copie automatique est bloquée. Sélectionnez le lien ci-dessus.';
    }
  }

  private requestAssistant(): void {
    if (!this.isCompleteProfile()) {
      this.errorMessage = 'Le contexte de départ est incomplet. Recommencez la création de la liste.';
      return;
    }

    this.isThinking = true;
    this.shouldScroll = true;

    const history = this.messages
      .slice(-20)
      .map(({ role, content }) => ({ role, content }));

    this.plannerService.chat({
      profile: this.profile,
      messages: history,
      selectedGifts: this.selectedGifts,
      profileSummary: this.profileSummary
    }).pipe(
      finalize(() => {
        this.isThinking = false;
        this.shouldScroll = true;
        this.focusComposer();
      })
    ).subscribe({
      next: response => this.handleAssistantResponse(response),
      error: () => {
        this.errorMessage = 'L’IA n’arrive pas à répondre pour le moment. Votre conversation est conservée.';
      }
    });
  }

  private loadSavedList(slug: string): void {
    if (this.isLoadingSavedList) {
      return;
    }
    this.isLoadingSavedList = true;
    this.errorMessage = '';
    this.sharedListService.getSharedList(slug)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingSavedList = false)
      )
      .subscribe({
        next: list => {
          const occasion = this.occasionChoices.find(choice =>
            choice.label.toLocaleLowerCase('fr') === String(list.occasion || '').toLocaleLowerCase('fr')
          )?.value || 'autre';
          this.stage = 'chat';
          this.profile = {
            audience: String(list.audienceLabel || '').toLocaleLowerCase('fr').includes('moi') ? 'self' : 'other',
            occasion,
            startMode: 'ideas'
          };
          this.selectedGifts = list.gifts.map(gift => ({
            name: gift.name,
            description: gift.description || '',
            reason: gift.reason || '',
            budgetLabel: gift.budgetLabel || '',
            productUrl: gift.productUrl || '',
            imageUrl: gift.imageUrl || ''
          }));
          this.currentSharedSlug = list.slug;
          this.currentSharedTitle = list.title;
          this.shareSlug = list.slug;
          this.shareTitle = list.title;
          this.profileSummary = '';
          this.messages = [{
            id: 1,
            role: 'assistant',
            content: `La liste « ${list.title} » est chargée. Vous pouvez modifier les cadeaux ou me demander de nouvelles idées.`
          }];
          this.nextMessageId = 2;
          this.shouldScroll = true;
          this.persistState();
        },
        error: error => {
          this.errorMessage = error?.error?.message || 'Impossible de charger cette liste.';
        }
      });
  }

  private handleAssistantResponse(response: PlannerChatResponse): void {
    const content = String(response?.message || '').trim();
    if (!content) {
      this.errorMessage = 'La réponse reçue est incomplète. Vous pouvez réessayer.';
      return;
    }

    const suggestions = Array.isArray(response.suggestions)
      ? response.suggestions.filter(suggestion => suggestion?.name)
      : [];
    this.messages.push({
      id: this.nextMessageId++,
      role: 'assistant',
      content,
      suggestions,
      quickReplies: Array.isArray(response.quickReplies)
        ? response.quickReplies.filter(reply => typeof reply === 'string' && reply.trim()).slice(0, 4)
        : []
    });
    this.profileSummary = String(response.profileSummary || this.profileSummary || '').trim();
    this.persistState();
    this.shouldScroll = true;
  }

  private addMessage(role: PlannerConversationMessage['role'], content: string): void {
    this.messages.push({ id: this.nextMessageId++, role, content });
    this.shouldScroll = true;
    this.persistState();
  }

  private isCompleteProfile(): this is { profile: PlannerProfile } & this {
    return Boolean(this.profile.audience && this.profile.occasion && this.profile.startMode);
  }

  private focusComposer(): void {
    window.setTimeout(() => this.messageInput?.nativeElement.focus(), 0);
  }

  private persistState(): void {
    const state: SavedPlannerState = {
      stage: this.stage,
      profile: this.profile,
      messages: this.messages,
      selectedGifts: this.selectedGifts,
      profileSummary: this.profileSummary,
      sharedSlug: this.currentSharedSlug,
      sharedTitle: this.currentSharedTitle
    };

    try {
      localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The planner remains usable when storage is unavailable.
    }
  }

  private restoreState(): void {
    try {
      const rawState = localStorage.getItem(PLANNER_STORAGE_KEY);
      if (!rawState) {
        return;
      }

      const state = JSON.parse(rawState) as SavedPlannerState;
      if (!['audience', 'occasion', 'start', 'chat'].includes(state.stage)) {
        return;
      }

      this.stage = state.stage;
      this.profile = state.profile || {};
      this.messages = Array.isArray(state.messages) ? state.messages : [];
      this.selectedGifts = Array.isArray(state.selectedGifts) ? state.selectedGifts : [];
      this.profileSummary = state.profileSummary || '';
      this.currentSharedSlug = state.sharedSlug || '';
      this.currentSharedTitle = state.sharedTitle || '';
      this.nextMessageId = Math.max(0, ...this.messages.map(message => Number(message.id) || 0)) + 1;
      this.shouldScroll = this.stage === 'chat';
    } catch {
      localStorage.removeItem(PLANNER_STORAGE_KEY);
    }
  }

  private normalizeSlug(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '');
  }

  private isValidOptionalUrl(value?: string): boolean {
    if (!value?.trim()) {
      return true;
    }
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
