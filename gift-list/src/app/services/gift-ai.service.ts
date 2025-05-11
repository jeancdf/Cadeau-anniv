import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({
  providedIn: 'root'
})
export class GiftAiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(environment.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({
      model: environment.geminiModel
    });
  }

  /**
   * Génère des suggestions de cadeaux basées sur un prompt
   * @param prompt Le prompt à envoyer à Gemini
   * @returns Une Observable contenant les suggestions de cadeaux
   */
  generateGiftSuggestions(prompt: string): Observable<any> {
    // Construction d'un prompt structuré pour Gemini
    const structuredPrompt = `
    Suggère 3 idées de cadeaux basées sur cette description: "${prompt}".
    Pour chaque cadeau, fournis:
    1. Un nom descriptif
    2. Une brève description
    3. Trois options de prix (bas, moyen, élevé) avec les informations suivantes pour chaque option:
       - Label: le nom de l'option
       - Prix (en euros)
       - Un lien e-commerce fictif
    
    Retourne le résultat sous forme de JSON structuré comme ceci:
    {
      "suggestions": [
        {
          "name": "Nom du cadeau",
          "description": "Description du cadeau",
          "pricePoints": [
            {"label": "Option Budget", "price": 15, "link": "https://example.com/budget"},
            {"label": "Option Standard", "price": 30, "link": "https://example.com/standard"},
            {"label": "Option Premium", "price": 60, "link": "https://example.com/premium"}
          ]
        },
        ...
      ]
    }
    `;
    
    // Appel à l'API Gemini et conversion en Observable
    return from(this.generateContent(structuredPrompt));
  }

  /**
   * Importe une liste de cadeaux existante et la structure au format approprié
   * @param existingList La liste de cadeaux textuels à importer
   * @returns Une Observable contenant les cadeaux structurés
   */
  importExistingGiftList(existingList: string): Observable<any> {
    const importPrompt = `
    Voici ma liste de cadeaux existante. Importe-la exactement telle quelle sans suggérer de nouveaux cadeaux.
    Conserve tous les éléments, prix, liens et options tels qu'ils sont spécifiés.
    Structure chaque cadeau dans le format JSON suivant:
    
    {
      "suggestions": [
        {
          "name": "Nom exact du cadeau",
          "description": "Description du cadeau (extraite du texte si disponible, sinon laisse vide)",
          "pricePoints": [
            {
              "label": "Option principale", 
              "price": prix en nombre entier sans symbole €, 
              "link": "lien mentionné"
            },
            {
              "label": "Option moins chère", 
              "price": prix en nombre entier sans symbole €, 
              "link": "lien mentionné pour l'option moins chère"
            }
          ]
        },
        ...
      ]
    }
    
    Voici ma liste à importer:
    ${existingList}
    `;
    
    return from(this.generateContent(importPrompt));
  }

  /**
   * Recherche des liens spécifiques pour un produit donné
   * @param productName Le nom du produit à rechercher
   * @param pricePoint Les informations de prix pour guider la recherche
   * @returns Observable avec des liens de produits spécifiques
   */
  findProductLinks(productName: string, pricePoint: any): Observable<any> {
    const productPrompt = `
    Trouve UN lien spécifique qui fonctionne ACTUELLEMENT pour ce produit: "${productName}" avec l'option "${pricePoint.label}" au prix d'environ ${pricePoint.price}€.
    
    IMPORTANT:
    1. Vérifie que chaque lien est actuellement fonctionnel et mène directement au produit
    2. Assure-toi que le produit est disponible à l'achat actuellement
    3. Priorise les sites de confiance comme Amazon.fr, Fnac.com, Cdiscount.com, Darty.com, Boulanger.com, etc.
    4. Évite les liens cassés ou qui mènent à des pages génériques
    
    Cherche d'abord un site fiable qui propose ce produit de façon vérifiable puis VÉRIFIE que le lien fonctionne.
    Ne fais PAS de supposition sur les liens, assure-toi qu'ils fonctionnent avant de les inclure.
    
    Retourne UNE SEULE option fiable sous forme de JSON:
    {
      "links": [
        {
          "title": "Titre exact du produit sur le site",
          "price": "Prix affiché (ex: 49,99€)",
          "url": "URL directe du produit qui fonctionne",
          "site": "Nom du site (ex: Amazon.fr)"
        }
      ]
    }
    `;
    
    return from(this.generateContent(productPrompt));
  }

  /**
   * Méthode privée pour appeler l'API Gemini
   */
  private async generateContent(prompt: string): Promise<any> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extraction du JSON depuis la réponse
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error('Erreur de parsing JSON:', e);
        // Si le parsing JSON échoue, on retourne un format structuré par défaut
        return {
          suggestions: [
            {
              name: "Erreur de format",
              description: "Impossible de traiter la réponse de l'IA. Voici le texte brut:",
              rawResponse: text,
              pricePoints: []
            }
          ]
        };
      }
    } catch (error) {
      console.error('Erreur lors de la génération de contenu:', error);
      throw error;
    }
  }
}
