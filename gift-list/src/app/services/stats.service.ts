import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface GiftStats {
  giftId: string;
  giftName: string;
  listSlug: string;
  listTitle: string;
  budgetLabel: string;
  estimatedMinimum: number | null;
  estimatedMaximum: number | null;
  clicks: number;
  merchants: Array<{ merchant: string; clicks: number }>;
}

export interface StatsOverview {
  generatedAt: string;
  summary: {
    lists: number;
    gifts: number;
    clicks: number;
    affiliateClicks: number;
  };
  budget: {
    giftsWithEstimate: number;
    coveragePercent: number;
    estimatedMinimumTotal: number;
    estimatedMaximumTotal: number;
    averageEstimatedPrice: number;
  };
  merchants: Array<{
    merchant: string;
    clicks: number;
    affiliateClicks: number;
  }>;
  gifts: GiftStats[];
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  getOverview(): Observable<StatsOverview> {
    const token = this.authService.getAuthToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<StatsOverview>(`${environment.apiUrl}/stats/overview`, { headers });
  }
}
