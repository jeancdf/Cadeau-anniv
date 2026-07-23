import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SharedGift {
  id?: string;
  name: string;
  description: string;
  reason: string;
  budgetLabel: string;
  productUrl?: string;
  imageUrl?: string;
  shoppingLinks?: SharedShoppingLink[];
}

export interface SharedShoppingLink {
  trackingKey: string;
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

  trackGiftClick(slug: string, giftId: string, linkKey: string): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/shared-lists/${encodeURIComponent(slug)}/gifts/${encodeURIComponent(giftId)}/clicks`,
      { linkKey }
    );
  }

  createSharedList(payload: SharedListPayload & { slug: string }): Observable<{ list: SharedList; editToken: string }> {
    return this.http.post<{ list: SharedList; editToken: string }>(
      `${environment.apiUrl}/shared-lists`,
      payload,
      { withCredentials: true }
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
      { headers, withCredentials: true }
    );
  }

  claimLocalLists(): Observable<number> {
    const editableLists = this.getLocalEditTokens();
    if (!editableLists.length) {
      return of(0);
    }

    return forkJoin(editableLists.map(({ slug, token }) => this.http.post(
      `${environment.apiUrl}/shared-lists/${encodeURIComponent(slug)}/claim`,
      {},
      {
        headers: new HttpHeaders({ 'X-Edit-Token': token }),
        withCredentials: true
      }
    ).pipe(
      map(() => 1),
      catchError(() => of(0))
    ))).pipe(map(results => results.reduce((total, result) => total + result, 0)));
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

  private getLocalEditTokens(): Array<{ slug: string; token: string }> {
    try {
      const entries: Array<{ slug: string; token: string }> = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(this.editTokenPrefix)) {
          continue;
        }
        const slug = key.slice(this.editTokenPrefix.length);
        const token = localStorage.getItem(key) || '';
        if (slug && token) {
          entries.push({ slug, token });
        }
      }
      return entries;
    } catch {
      return [];
    }
  }
}
