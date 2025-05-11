import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GiftService {
  private apiUrl = environment.apiUrl;
  private secretKey = environment.secretKey;

  constructor(private http: HttpClient) { }

  // Headers pour toutes les requêtes
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Secret-Key': this.secretKey
    });
  }

  // Récupérer la liste des cadeaux
  getGifts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gifts`, { headers: this.getHeaders() });
  }

  // Ajouter un nouveau cadeau
  addGift(gift: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/gifts`, gift, { headers: this.getHeaders() });
  }

  // Mettre à jour un cadeau
  updateGift(id: string, gift: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/gifts/${id}`, gift, { headers: this.getHeaders() });
  }

  // Supprimer un cadeau
  deleteGift(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/gifts/${id}`, { headers: this.getHeaders() });
  }

  // Exporter la liste au format JSON
  exportGifts(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/gifts`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Télécharger le fichier JSON
  downloadGiftsAsJson(data: Blob): void {
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gift-list.json';
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
