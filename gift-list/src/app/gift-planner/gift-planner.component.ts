import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom } from 'rxjs';
import {
  GiftPlannerService,
  PlannerChatResponse,
  PlannerConversationMessage,
  PlannerGiftSuggestion,
  PlannerProfile
} from '../services/gift-planner.service';

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
  sharedListId?: string;
  publishedListSignature?: string;
}

export const PLANNER_STORAGE_KEY = 'gift-finder-planner-v1';

@Component({
  selector: 'app-gift-planner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gift-planner.component.html',
  styleUrl: './gift-planner.component.css'
})
export class GiftPlannerComponent implements AfterViewChecked {
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
  isPublishing = false;

  private nextMessageId = 1;
  private shouldScroll = false;
  private sharedListId = '';
  private publishedListSignature = '';

  constructor(private readonly plannerService: GiftPlannerService) {
    this.restoreState();
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
    this.invalidatePublishedList();
    this.persistState();
  }

  rejectGift(suggestion: PlannerGiftSuggestion): void {
    this.sendMessage(`L’idée « ${suggestion.name} » ne me convient pas. Propose-moi une autre piste et demande-moi pourquoi si cela peut t’aider.`);
  }

  removeGift(index: number): void {
    this.selectedGifts = this.selectedGifts.filter((_, giftIndex) => giftIndex !== index);
    this.invalidatePublishedList();
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

  trackMessage(_: number, message: ChatMessage): number {
    return message.id;
  }

  trackGift(index: number, gift: PlannerGiftSuggestion): string {
    return `${gift.name}-${index}`;
  }

  restart(): void {
    if (this.stage === 'chat' && this.messages.length
      && !window.confirm('Recommencer effacera cette conversation et la liste en cours. Continuer ?')) {
      return;
    }

    this.stage = 'audience';
    this.profile = {};
    this.messages = [];
    this.selectedGifts = [];
    this.profileSummary = '';
    this.draftMessage = '';
    this.errorMessage = '';
    this.isMobileListOpen = false;
    this.sharedListId = '';
    this.publishedListSignature = '';
    this.nextMessageId = 1;
    localStorage.removeItem(PLANNER_STORAGE_KEY);
  }

  async shareDraft(): Promise<void> {
    if (!this.selectedGifts.length || this.isPublishing) {
      return;
    }

    this.isPublishing = true;
    this.shareLabel = 'Création du lien…';
    try {
      const currentSignature = this.getPublishedListSignature();
      if (!this.sharedListId || this.publishedListSignature !== currentSignature) {
        const response = await firstValueFrom(this.plannerService.publishList({
          occasion: this.occasionLabel,
          audienceLabel: this.audienceLabel,
          gifts: this.selectedGifts
        }));
        this.sharedListId = response.publicId;
        this.publishedListSignature = currentSignature;
        this.persistState();
      }

      const publicUrl = new URL(
        `liste/${encodeURIComponent(this.sharedListId)}`,
        document.baseURI
      ).toString();
      const shareData = {
        title: `Ma liste de cadeaux · ${this.occasionLabel}`,
        text: 'Voici ma liste Gift Finder avec toutes les idées et les liens pour les retrouver.',
        url: publicUrl
      };

      if (navigator.share) {
        await navigator.share(shareData);
        this.shareLabel = 'Liste partagée !';
      } else {
        await this.copyText(publicUrl);
        this.shareLabel = 'Lien copié !';
      }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') {
        this.shareLabel = 'Partager';
        return;
      }
      this.shareLabel = 'Réessayer';
      this.errorMessage = 'Impossible de créer le lien public pour le moment. Réessayez dans quelques instants.';
    } finally {
      this.isPublishing = false;
    }

    window.setTimeout(() => this.shareLabel = 'Partager', 2400);
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
      sharedListId: this.sharedListId,
      publishedListSignature: this.publishedListSignature
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
      this.sharedListId = state.sharedListId || '';
      this.publishedListSignature = state.publishedListSignature || '';
      this.nextMessageId = Math.max(0, ...this.messages.map(message => Number(message.id) || 0)) + 1;
      this.shouldScroll = this.stage === 'chat';
    } catch {
      localStorage.removeItem(PLANNER_STORAGE_KEY);
    }
  }

  private invalidatePublishedList(): void {
    this.sharedListId = '';
    this.publishedListSignature = '';
    this.shareLabel = 'Partager';
  }

  private getPublishedListSignature(): string {
    return JSON.stringify({
      occasion: this.occasionLabel,
      audienceLabel: this.audienceLabel,
      gifts: this.selectedGifts
    });
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
      throw new Error('La copie du lien a échoué');
    }
  }
}
