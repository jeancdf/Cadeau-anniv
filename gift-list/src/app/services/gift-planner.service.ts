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
  name: string;
  description: string;
  reason: string;
  budgetLabel: string;
  productUrl?: string;
  imageUrl?: string;
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

@Injectable({ providedIn: 'root' })
export class GiftPlannerService {
  constructor(private readonly http: HttpClient) {}

  chat(request: PlannerChatRequest): Observable<PlannerChatResponse> {
    return this.http.post<PlannerChatResponse>(`${environment.apiUrl}/ai/chat`, request);
  }
}
