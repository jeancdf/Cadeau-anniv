import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PlannerMessageRole = 'user' | 'assistant';

export interface PlannerProfile {
  audience: 'self' | 'other';
  occasion: string;
  startMode: 'ideas' | 'describe' | 'guide' | 'surprise';
}

export interface PlannerConversationMessage {
  role: PlannerMessageRole;
  content: string;
}

export interface PlannerGiftSuggestion {
  id?: string;
  name: string;
  description: string;
  reason: string;
  budgetLabel: string;
  productUrl?: string;
  imageUrl?: string;
}

export interface SharedGiftLink {
  trackingKey: string;
  merchant: string;
  label: string;
  url: string;
  isAffiliate: boolean;
}

export interface SharedGift extends PlannerGiftSuggestion {
  shoppingLinks: SharedGiftLink[];
}

export interface SharedGiftList {
  publicId: string;
  occasion: string;
  audienceLabel: string;
  gifts: SharedGift[];
  createdAt: string;
}

export interface PlannerChatResponse {
  message: string;
  quickReplies: string[];
  suggestions: PlannerGiftSuggestion[];
  profileSummary?: string;
}

interface PlannerChatRequest {
  profile: PlannerProfile;
  messages: PlannerConversationMessage[];
  selectedGifts: PlannerGiftSuggestion[];
  profileSummary: string;
}

interface PublishGiftListRequest {
  occasion: string;
  audienceLabel: string;
  gifts: PlannerGiftSuggestion[];
}

@Injectable({ providedIn: 'root' })
export class GiftPlannerService {
  constructor(private readonly http: HttpClient) {}

  chat(request: PlannerChatRequest): Observable<PlannerChatResponse> {
    return this.http.post<PlannerChatResponse>(`${environment.apiUrl}/ai/chat`, request);
  }

  publishList(request: PublishGiftListRequest): Observable<{ publicId: string }> {
    return this.http.post<{ publicId: string }>(`${environment.apiUrl}/shared-lists`, request);
  }

  getSharedList(publicId: string): Observable<SharedGiftList> {
    return this.http.get<SharedGiftList>(
      `${environment.apiUrl}/shared-lists/${encodeURIComponent(publicId)}`
    );
  }
}
