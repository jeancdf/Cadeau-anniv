import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SharedGift {
  name: string;
  description: string;
  reason: string;
  budgetLabel: string;
  productUrl?: string;
  imageUrl?: string;
  shoppingLinks?: SharedShoppingLink[];
}

export interface SharedShoppingLink {
  merchant: string;
  label: string;
  url: string;
  isAffiliate: boolean;
}

export interface SharedList {
  slug: string;
  title: string;
  occasion: string;
  audienceLabel?: string;
  gifts: SharedGift[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SharedListPayload {
  title: string;
  occasion: string;
  audienceLabel?: string;
  gifts: SharedGift[];
}

export interface ProductPreview {
  productUrl: string;
  title: string;
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class SharedListService {
  private readonly editTokenPrefix = 'gift-finder-shared-list-edit:';

  constructor(
    private readonly http: HttpClient,
    private readonly location: Location
  ) {}

  getSharedList(slug: string): Observable<SharedList> {
    return this.http.get<SharedList>(`${environment.apiUrl}/shared-lists/${encodeURIComponent(slug)}`);
  }

  createSharedList(payload: SharedListPayload & { slug: string }): Observable<{ list: SharedList; editToken: string }> {
    return this.http.post<{ list: SharedList; editToken: string }>(
      `${environment.apiUrl}/shared-lists`,
      payload
    ).pipe(tap(response => {
      this.saveEditToken(response.list.slug, response.editToken);
    }));
  }

  updateSharedList(slug: string, payload: SharedListPayload): Observable<{ list: SharedList }> {
    const editToken = this.getEditToken(slug);
    const headers = editToken ? new HttpHeaders({ 'X-Edit-Token': editToken }) : undefined;
    return this.http.put<{ list: SharedList }>(
      `${environment.apiUrl}/shared-lists/${encodeURIComponent(slug)}`,
      payload,
      { headers }
    );
  }

  previewProduct(url: string): Observable<ProductPreview> {
    return this.http.post<ProductPreview>(`${environment.apiUrl}/product-preview`, { url });
  }

  hasEditToken(slug: string): boolean {
    return Boolean(this.getEditToken(slug));
  }

  getPublicUrl(slug: string): string {
    const externalPath = this.location.prepareExternalUrl(`/liste/${encodeURIComponent(slug)}`);
    return new URL(externalPath, window.location.origin).toString();
  }

  private getEditToken(slug: string): string {
    try {
      return localStorage.getItem(`${this.editTokenPrefix}${slug}`) || '';
    } catch {
      return '';
    }
  }

  private saveEditToken(slug: string, token: string): void {
    try {
      localStorage.setItem(`${this.editTokenPrefix}${slug}`, token);
    } catch {
      // La consultation publique reste disponible si le stockage est bloqué.
    }
  }
}
