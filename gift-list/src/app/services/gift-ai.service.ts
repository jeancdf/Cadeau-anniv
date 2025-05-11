import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
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
   * @param existingGifts Liste des cadeaux déjà sélectionnés par l'utilisateur (optionnel)
   * @returns Une Observable contenant les suggestions de cadeaux
   */
  generateGiftSuggestions(prompt: string, existingGifts: any[] = []): Observable<any> {
    // Extraire les catégories et intérêts des cadeaux existants
    let existingCategories: string[] = [];
    let existingInterests: string[] = [];
    
    if (existingGifts && existingGifts.length > 0) {
      // Convertir les cadeaux existants en texte formaté pour le contexte
      const existingGiftsContext = existingGifts.map(gift => 
        `- "${gift.name}"${gift.description ? ` (${gift.description})` : ''}`
      ).join('\n');
      
      // Identifier les intérêts potentiels en fonction des cadeaux existants
      existingCategories = this.extractCategories(existingGifts);
      existingInterests = this.extractInterests(existingGifts);
      
      // Construction d'un prompt structuré qui prend en compte les cadeaux existants
      const structuredPrompt = `
      Voici une demande de suggestions de cadeaux: "${prompt}".
      
      L'utilisateur a déjà les cadeaux suivants dans sa liste de souhaits:
      ${existingGiftsContext}
      
      J'ai identifié ces centres d'intérêt possibles: ${existingInterests.join(', ')}
      Et ces catégories possibles: ${existingCategories.join(', ')}
      
      IMPORTANT: 
      - Sois BREF et CONCIS dans toutes tes réponses
      - Identifie 1-2 centres d'intérêt PRINCIPAUX et concentre-toi sur eux
      - Ne force PAS des connexions entre des intérêts non liés (ex: ne pas mélanger golf et art)
      - Suggère des cadeaux qui correspondent DIRECTEMENT à un intérêt spécifique
      
      Suggère 3 idées de cadeaux en suivant ces règles:
      1. Chaque cadeau doit être clairement lié à UN intérêt spécifique (pas de combinaisons forcées)
      2. Les suggestions doivent être concrètes et utiles
      3. Évite les cadeaux trop similaires à ceux déjà dans la liste
      4. Privilégie les cadeaux directement liés au centre d'intérêt
      
      Pour l'analyse:
      - Identifie les 1-2 centres d'intérêt PRINCIPAUX ressortant de la demande et des cadeaux existants
      - Explique brièvement pourquoi tu te concentres sur ces intérêts spécifiques
      
      Pour chaque cadeau, fournis:
      1. Un nom descriptif court et précis
      2. Une brève description (max 80 caractères)
      3. Un court raisonnement (max 100 caractères)
      4. Trois options de prix (bas, moyen, élevé) avec:
         - Label court et descriptif
         - Prix (en euros, sans symbole €)
         - Un lien e-commerce fictif
      
      Retourne le résultat sous forme de JSON structuré comme ceci:
      {
        "analysisIntro": "Identification claire des 1-2 intérêts principaux (max 100 caractères)",
        "analysisMethod": "Explication courte du focus (max 80 caractères)",
        "identifiedInterests": ["intérêt1", "intérêt2"],
        "suggestions": [
          {
            "name": "Nom du cadeau",
            "description": "Description brève (max 80 caractères)",
            "reasoning": "Explication du lien direct avec l'intérêt principal (max 100 caractères)",
            "relatedInterests": ["Un seul intérêt principal"],
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
    } else {
      // Si aucun cadeau existant, utiliser un prompt simple mais qui inclut quand même le raisonnement
    const structuredPrompt = `
    Suggère 3 idées de cadeaux basées sur cette description: "${prompt}".
      
      IMPORTANT: 
      - Sois BREF et CONCIS dans toutes tes réponses
      - Identifie 1-2 centres d'intérêt PRINCIPAUX dans la demande et concentre-toi sur eux
      - Suggère des cadeaux qui correspondent DIRECTEMENT à un intérêt spécifique
      - Ne force PAS des connexions entre des intérêts non liés
      
      Pour l'analyse:
      - Identifie les 1-2 intérêts PRINCIPAUX ressortant de la demande
      - Concentre chaque suggestion sur UN intérêt spécifique
      
    Pour chaque cadeau, fournis:
      1. Un nom descriptif court et précis
      2. Une brève description (max 80 caractères)
      3. Un court raisonnement (max 100 caractères)
      4. Trois options de prix (bas, moyen, élevé) avec:
         - Label court et descriptif
         - Prix (en euros, sans symbole €)
       - Un lien e-commerce fictif
    
    Retourne le résultat sous forme de JSON structuré comme ceci:
    {
        "analysisIntro": "Identification claire des 1-2 intérêts principaux (max 100 caractères)",
        "analysisMethod": "Explication courte du focus (max 80 caractères)",
      "suggestions": [
        {
          "name": "Nom du cadeau",
            "description": "Description brève (max 80 caractères)",
            "reasoning": "Explication du lien direct avec l'intérêt principal (max 100 caractères)",
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
    // Utiliser l'IA pour générer des termes de recherche optimisés
    const searchTermPrompt = `
    Génère 3 termes de recherche spécifiques pour trouver ce produit en ligne:
    - Produit: "${productName}"
    - Option/Variante: "${pricePoint.label}"
    - Fourchette de prix: Environ ${pricePoint.price}€
    
    Formate ta réponse en JSON:
    {
      "searchTerms": [
        "terme de recherche exact 1",
        "terme de recherche exact 2",
        "terme de recherche exact 3"
      ],
      "productType": "catégorie du produit (électronique, vêtements, livres, etc.)"
    }
    `;
    
    // Générer des termes de recherche avec l'IA, puis transformer en URLs de recherche structurées
    return from(this.generateContent(searchTermPrompt)).pipe(
      map(response => {
        let searchData;
        try {
          searchData = JSON.parse(response);
        } catch (e) {
          // Extraire le JSON s'il est intégré dans du texte
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              searchData = JSON.parse(jsonMatch[0]);
            } catch (e) {
              throw new Error('Échec du parsing de la réponse IA');
            }
          } else {
            throw new Error('La réponse de l\'IA ne contient pas de JSON valide');
          }
        }
        
        // Créer des URLs de recherche structurées basées sur les termes générés par l'IA
        return this.generateStructuredSearchLinks(searchData, productName, pricePoint);
      }),
      catchError(error => {
        console.error('Erreur lors de la génération des liens de produits:', error);
        return of({ links: this.getFallbackSearchLinks(productName, pricePoint) });
      })
    );
  }

  /**
   * Génère des liens de recherche structurés basés sur les termes suggérés par l'IA
   */
  private generateStructuredSearchLinks(searchData: any, productName: string, pricePoint: any): any {
    const links = [];
    const searchTerms = searchData.searchTerms || [];
    
    // Utiliser les termes fournis ou créer un terme de recherche par défaut
    const mainTerm = searchTerms[0] || `${productName} ${pricePoint.label}`;
    
    // Créer des liens de recherche spécifiques au site avec un encodage approprié
    if (mainTerm) {
      const encodedTerm = encodeURIComponent(mainTerm);
      
      // Choisir les sites appropriés en fonction du type de produit
      const productType = searchData.productType || '';
      const sites = this.getSitesForProductType(productType);
      
      sites.forEach(site => {
        links.push({
          title: `${mainTerm} sur ${site.name}`,
          price: `Environ ${pricePoint.price}€`,
          url: site.searchUrlTemplate.replace('{searchTerm}', encodedTerm),
          site: site.name
        });
      });
      
      // Ajouter des termes spécialisés si disponibles
      if (searchTerms.length > 1) {
        const alternativeLinks = searchTerms.slice(1).map((term: string) => {
          const encodedAltTerm = encodeURIComponent(term);
          return {
            title: `${term} sur ${sites[0].name}`,
            price: `Environ ${pricePoint.price}€`,
            url: sites[0].searchUrlTemplate.replace('{searchTerm}', encodedAltTerm),
            site: sites[0].name
          };
        });
        
        links.push(...alternativeLinks);
      }
    }
    
    return { links };
  }

  /**
   * Obtenir les sites e-commerce appropriés en fonction du type de produit
   */
  private getSitesForProductType(productType: string): Array<{name: string, searchUrlTemplate: string}> {
    // Sites par défaut
    const defaultSites = [
      { name: 'Amazon.fr', searchUrlTemplate: 'https://www.amazon.fr/s?k={searchTerm}' },
      { name: 'Fnac', searchUrlTemplate: 'https://www.fnac.com/SearchResult/ResultList.aspx?Search={searchTerm}' },
      { name: 'Cdiscount', searchUrlTemplate: 'https://www.cdiscount.com/search/10/{searchTerm}.html' }
    ];
    
    // Ajouter des sites spécialisés en fonction du type de produit
    const productTypeLower = productType.toLowerCase();
    if (productTypeLower.includes('électronique') || 
        productTypeLower.includes('electronic') || 
        productTypeLower.includes('tech')) {
      defaultSites.push(
        { name: 'Darty', searchUrlTemplate: 'https://www.darty.com/nav/recherche?text={searchTerm}' },
        { name: 'Boulanger', searchUrlTemplate: 'https://www.boulanger.com/resultats?tr={searchTerm}' }
      );
    } else if (productTypeLower.includes('vêtement') || 
              productTypeLower.includes('clothing') || 
              productTypeLower.includes('mode')) {
      defaultSites.push(
        { name: 'Zalando', searchUrlTemplate: 'https://www.zalando.fr/recherche/?q={searchTerm}' },
        { name: 'La Redoute', searchUrlTemplate: 'https://www.laredoute.fr/pplp/{searchTerm}.aspx' }
      );
    } else if (productTypeLower.includes('livre') || 
              productTypeLower.includes('book')) {
      defaultSites.push(
        { name: 'Decitre', searchUrlTemplate: 'https://www.decitre.fr/recherche/resultat?q={searchTerm}' },
        { name: 'Cultura', searchUrlTemplate: 'https://www.cultura.com/catalogsearch/result/?q={searchTerm}' }
      );
    } else if (productTypeLower.includes('meuble') || 
              productTypeLower.includes('furniture') || 
              productTypeLower.includes('déco')) {
      defaultSites.push(
        { name: 'IKEA', searchUrlTemplate: 'https://www.ikea.com/fr/fr/search/?q={searchTerm}' },
        { name: 'Maisons du Monde', searchUrlTemplate: 'https://www.maisonsdumonde.com/FR/fr/search/{searchTerm}' }
      );
    }
    
    return defaultSites;
  }

  /**
   * Obtenir des liens de recherche de secours si l'IA échoue
   */
  private getFallbackSearchLinks(productName: string, pricePoint: any): any[] {
    const searchTerm = `${productName} ${pricePoint.label}`;
    const encodedTerm = encodeURIComponent(searchTerm);
    
    return [
      {
        title: `${searchTerm} sur Amazon`,
        price: `Environ ${pricePoint.price}€`,
        url: `https://www.amazon.fr/s?k=${encodedTerm}`,
        site: 'Amazon.fr'
      },
      {
        title: `${searchTerm} sur Fnac`,
        price: `Environ ${pricePoint.price}€`,
        url: `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodedTerm}`,
        site: 'Fnac'
      },
      {
        title: `${searchTerm} sur Google Shopping`,
        price: `Environ ${pricePoint.price}€`,
        url: `https://www.google.com/search?tbm=shop&q=${encodedTerm}`,
        site: 'Google Shopping'
      }
    ];
  }

  /**
   * Recherche des alternatives moins chères pour un produit
   * @param productName Le nom du produit
   * @param pricePoint Les informations sur le prix actuel
   * @returns Observable contenant des alternatives moins chères
   */
  findCheaperAlternatives(productName: string, pricePoint: any): Observable<any> {
    const maxTargetPrice = Math.round(pricePoint.price * 0.7); // 70% du prix original
    
    const prompt = `
    Trouve 3 alternatives moins chères pour ce produit:
    
    Produit: "${productName}"
    Option actuelle: "${pricePoint.label}" à ${pricePoint.price}€
    
    OBJECTIF: Suggérer des options similaires mais moins chères (max ${maxTargetPrice}€)
    
    IMPORTANT: Sois BREF et CONCIS. Une phrase par alternative maximum.
    
    Format JSON attendu:
    {
      "alternatives": [
        {
          "label": "Nom court de l'alternative",
          "price": prix en nombre (sans symbole €),
          "link": "lien fictif mais réaliste",
          "description": "Description très brève (max 80 caractères)"
        },
        ...
      ]
    }
    `;
    
    // Génération d'alternatives moins chères avec l'IA
    return from(this.generateContent(prompt)).pipe(
      map(response => {
        if (!response || !response.alternatives || !Array.isArray(response.alternatives)) {
          // Générer un ensemble d'alternatives par défaut si l'IA échoue
          return {
            alternatives: this.generateDefaultCheaperAlternatives(productName, pricePoint)
          };
        }
        return response;
      }),
      catchError(error => {
        console.error('Erreur lors de la génération d\'alternatives moins chères:', error);
        return of({
          alternatives: this.generateDefaultCheaperAlternatives(productName, pricePoint)
        });
      })
    );
  }
  
  /**
   * Génère des alternatives moins chères par défaut en cas d'échec de l'IA
   */
  private generateDefaultCheaperAlternatives(productName: string, pricePoint: any): any[] {
    const originalPrice = pricePoint.price;
    
    // Calculer trois niveaux de prix réduits (70%, 60%, 50% du prix original)
    const budget1 = Math.round(originalPrice * 0.7);
    const budget2 = Math.round(originalPrice * 0.6);
    const budget3 = Math.round(originalPrice * 0.5);
    
    return [
      {
        label: `${productName} - Version économique`,
        price: budget1,
        link: "https://example.com/budget",
        description: `Une version plus abordable du ${productName} original avec les fonctions essentielles.`
      },
      {
        label: `Alternative à ${pricePoint.label}`,
        price: budget2,
        link: "https://example.com/alternative",
        description: `Option plus économique qui offre un bon rapport qualité-prix, mais avec quelques fonctionnalités en moins.`
      },
      {
        label: `Modèle d'entrée de gamme`,
        price: budget3,
        link: "https://example.com/basic",
        description: `Version basique qui offre les fonctionnalités principales à prix mini.`
      }
    ];
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

  /**
   * Extrait les catégories potentielles des cadeaux existants
   * @param gifts Liste des cadeaux existants
   * @returns Un tableau de catégories
   */
  private extractCategories(gifts: any[]): string[] {
    const categories = new Set<string>();
    const categoryKeywords: {[key: string]: string[]} = {
      'Électronique': ['téléphone', 'ordinateur', 'écran', 'casque', 'écouteur', 'caméra', 'appareil', 'montre', 'tablette', 'projecteur', 'enceinte', 'bluetooth'],
      'Sport': ['sport', 'fitness', 'golf', 'tennis', 'football', 'vélo', 'natation', 'course', 'randonnée', 'escalade', 'ski'],
      'Jeux Vidéo': ['jeu', 'vidéo', 'console', 'gaming', 'playstation', 'xbox', 'nintendo', 'manette'],
      'Livres': ['livre', 'roman', 'bd', 'manga', 'lecture'],
      'Mode': ['vêtement', 'chaussure', 'sac', 'montre', 'bijou', 'accessoire', 'mode'],
      'Cuisine': ['cuisine', 'cuisson', 'robot', 'couteau', 'ustensile', 'plat', 'service'],
      'Maison': ['déco', 'décoration', 'meuble', 'intérieur', 'jardin', 'plante', 'outil', 'bricolage'],
      'Beauté': ['beauté', 'cosmétique', 'parfum', 'soin', 'maquillage']
    };
    
    // Parcourir chaque cadeau
    gifts.forEach(gift => {
      const textToAnalyze = (gift.name + ' ' + (gift.description || '')).toLowerCase();
      
      // Tester chaque catégorie
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        // Si un mot-clé de la catégorie est trouvé, ajouter la catégorie
        if (keywords.some(keyword => textToAnalyze.includes(keyword.toLowerCase()))) {
          categories.add(category);
        }
      });
    });
    
    return Array.from(categories);
  }
  
  /**
   * Extrait les intérêts potentiels des cadeaux existants
   * @param gifts Liste des cadeaux existants
   * @returns Un tableau d'intérêts
   */
  private extractInterests(gifts: any[]): string[] {
    // Extraire les mots-clés significatifs des noms et descriptions
    const allText = gifts.map(gift => 
      (gift.name + ' ' + (gift.description || '')).toLowerCase()
    ).join(' ');
    
    // Liste de mots-clés d'intérêts potentiels à rechercher
    const interestKeywords = [
      'gaming', 'jeux', 'vidéo', 'sport', 'golf', 'tennis', 'football', 
      'lecture', 'livres', 'cuisine', 'voyage', 'technologie', 'musique',
      'photo', 'photographie', 'plein air', 'bricolage', 'jardinage',
      'collection', 'art', 'cinéma', 'films', 'séries', 'mode', 'beauté',
      'bien-être', 'fitness', 'randonnée', 'vélo', 'informatique', 'programmation',
      'gastronomie', 'vin', 'bière', 'whisky', 'décoration', 'design'
    ];
    
    // Trouver les intérêts qui apparaissent dans le texte
    const foundInterests = interestKeywords.filter(keyword => 
      allText.includes(keyword.toLowerCase())
    );
    
    // Si aucun intérêt spécifique n'est trouvé, extraire les noms de produits comme intérêts
    if (foundInterests.length === 0) {
      const uniqueProductNames = new Set(
        gifts.map(gift => {
          // Extraire le type de produit (premier mot du nom généralement)
          const words = gift.name.split(' ');
          return words[0].toLowerCase();
        })
      );
      return Array.from(uniqueProductNames);
    }
    
    return foundInterests;
  }

  /**
   * Suggère des catégories de cadeaux à explorer basées sur les cadeaux existants
   * @param existingGifts Liste des cadeaux existants
   * @returns Observable contenant les catégories suggérées
   */
  suggestCategoriesToExplore(existingGifts: any[]): Observable<any> {
    if (!existingGifts || existingGifts.length === 0) {
      // Si aucun cadeau existant, retourner des catégories populaires par défaut
      return of({
        currentCategories: [],
        suggestedCategories: [
          {
            name: 'Technologie',
            examples: ['Écouteurs sans fil', 'Montres connectées', 'Accessoires pour smartphone'],
            reasoning: 'Les gadgets technologiques sont populaires et offrent une grande variété d\'options.'
          },
          {
            name: 'Loisirs créatifs',
            examples: ['Kit de peinture', 'Matériel de dessin', 'Instruments de musique'],
            reasoning: 'Les activités créatives permettent de se détendre tout en développant de nouvelles compétences.'
          },
          {
            name: 'Expériences',
            examples: ['Cours de cuisine', 'Activités sportives', 'Billets de spectacle'],
            reasoning: 'Les expériences offrent des souvenirs durables plutôt que des objets matériels.'
          }
        ],
        analysisExplanation: 'Comme vous n\'avez pas encore de cadeaux dans votre liste, voici quelques catégories populaires pour commencer.'
      });
    }
    
    // Extraire les catégories des cadeaux existants
    const existingCategories = this.extractCategories(existingGifts);
    const existingInterests = this.extractInterests(existingGifts);
    
    // Formater le texte pour les cadeaux existants
    const existingGiftsContext = existingGifts.map(gift => 
      `- "${gift.name}"${gift.description ? ` (${gift.description})` : ''}`
    ).join('\n');
    
    const prompt = `
    Je vais t'aider à découvrir de nouvelles catégories de cadeaux qui pourraient t'intéresser.
    
    Voici les cadeaux actuellement dans ta liste de souhaits:
    ${existingGiftsContext}
    
    Catégories déjà présentes: ${existingCategories.join(', ')}
    Centres d'intérêt identifiés: ${existingInterests.join(', ')}
    
    IMPORTANT: Sois TRÈS CONCIS. Limite toutes les explications à 1-2 phrases maximum.
    
    En fonction de ces préférences, suggère 3-4 NOUVELLES catégories de cadeaux que cette personne pourrait aimer explorer, mais qui ne sont pas encore représentées dans sa liste actuelle.
    
    Pour chaque catégorie suggérée:
    1. Donne un nom clair et concis
    2. Fournis 3 exemples spécifiques de cadeaux dans cette catégorie
    3. Explique en une phrase pourquoi cette catégorie pourrait l'intéresser
    
    Format de réponse (JSON):
    {
      "analysisExplanation": "Explication brève des tendances observées (max 100 caractères)",
      "interestPatterns": "Tendances identifiées en une phrase (max 80 caractères)",
      "currentCategories": ["Catégorie1", "Catégorie2"],
      "currentInterests": ["Intérêt1", "Intérêt2"],
      "suggestedCategories": [
        {
          "name": "Nom de la catégorie",
          "examples": ["Exemple 1", "Exemple 2", "Exemple 3"],
          "reasoning": "Explication en une phrase (max 100 caractères)"
        },
        ...
      ]
    }
    `;
    
    return from(this.generateContent(prompt)).pipe(
      map(response => {
        if (!response || !response.suggestedCategories) {
          // Fallback si l'IA ne produit pas la structure attendue
          return {
            currentCategories: existingCategories,
            currentInterests: existingInterests,
            suggestedCategories: this.getDefaultSuggestedCategories(existingCategories),
            analysisExplanation: "Analyse basée sur les catégories détectées dans vos cadeaux actuels."
          };
        }
        return response;
      }),
      catchError(error => {
        console.error('Erreur lors de la suggestion de catégories:', error);
        return of({
          currentCategories: existingCategories,
          currentInterests: existingInterests,
          suggestedCategories: this.getDefaultSuggestedCategories(existingCategories),
          analysisExplanation: "Analyse basée sur les catégories détectées dans vos cadeaux actuels."
        });
      })
    );
  }
  
  /**
   * Génère des suggestions de cadeaux basées sur une catégorie spécifique
   * @param prompt Description de base des cadeaux souhaités
   * @param category Catégorie spécifique à explorer
   * @param existingGifts Cadeaux existants pour contexte
   * @returns Observable avec des suggestions ciblées
   */
  generateCategorySpecificSuggestions(prompt: string, category: string, existingGifts: any[] = []): Observable<any> {
    // Extraire le contexte des cadeaux existants
    const existingGiftsContext = existingGifts.length > 0 
      ? existingGifts.map(gift => 
          `- "${gift.name}"${gift.description ? ` (${gift.description})` : ''}`
        ).join('\n')
      : '';
    
    // Construire un prompt pour des suggestions ciblées sur la catégorie
    const categoryPrompt = `
    Génère 3 idées de cadeaux spécifiquement dans la catégorie "${category}".
    
    Contexte de la demande originale: "${prompt}"
    
    ${existingGifts.length > 0 ? `Cadeaux déjà dans la liste de souhaits:
    ${existingGiftsContext}
    
    Assure-toi que les suggestions sont différentes des cadeaux déjà présents.` : ''}
    
    IMPORTANT:
    - Sois TRÈS CONCIS et direct
    - Concentre-toi UNIQUEMENT sur la catégorie "${category}"
    - Propose des cadeaux spécifiques, utiles et concrets
    - Pas de descriptions vagues ou génériques
    
    Pour chaque cadeau, fournis:
    1. Un nom descriptif précis (pas de nom générique)
    2. Une description courte et utile (max 80 caractères)
    3. Trois options de prix avec:
       - Label court mais descriptif
       - Prix réaliste (en euros, nombre entier)
       - Un lien e-commerce fictif
    
    Retourne le résultat sous forme de JSON:
    {
      "suggestions": [
        {
          "name": "Nom précis du cadeau (pas de nom générique)",
          "description": "Description brève et concrète (max 80 caractères)",
          "category": "${category}",
          "pricePoints": [
            {"label": "Option économique", "price": 15, "link": "https://example.com/budget"},
            {"label": "Option standard", "price": 30, "link": "https://example.com/standard"},
            {"label": "Option premium", "price": 60, "link": "https://example.com/premium"}
          ]
        },
        ...
      ]
    }
    `;
    
    return from(this.generateContent(categoryPrompt));
  }
  
  /**
   * Génère des catégories par défaut à suggérer en évitant celles déjà présentes
   */
  private getDefaultSuggestedCategories(existingCategories: string[]): any[] {
    const allCategories = [
      {
        name: 'Technologie',
        examples: ['Écouteurs sans fil', 'Montre connectée', 'Enceinte bluetooth'],
        reasoning: 'Des gadgets modernes qui facilitent le quotidien'
      },
      {
        name: 'Sport et Fitness',
        examples: ['Montre de sport', 'Équipement d\'entraînement', 'Vêtements techniques'],
        reasoning: 'Pour rester en forme et pratiquer des activités physiques'
      },
      {
        name: 'Cuisine et Gastronomie',
        examples: ['Ustensiles de cuisine', 'Livre de recettes', 'Coffret dégustation'],
        reasoning: 'Explorer de nouvelles saveurs et techniques culinaires'
      },
      {
        name: 'Loisirs créatifs',
        examples: ['Kit de peinture', 'Matériel de dessin', 'Instrument de musique'],
        reasoning: 'Exprimer sa créativité et développer de nouvelles compétences'
      },
      {
        name: 'Voyages et Aventures',
        examples: ['Accessoires de voyage', 'Guide de destinations', 'Expérience à l\'étranger'],
        reasoning: 'Découvrir de nouveaux horizons et cultures'
      },
      {
        name: 'Bien-être et Détente',
        examples: ['Diffuseur d\'huiles essentielles', 'Accessoires de yoga', 'Produits de relaxation'],
        reasoning: 'Prendre soin de soi et se détendre'
      },
      {
        name: 'Maison et Décoration',
        examples: ['Objets décoratifs', 'Plantes d\'intérieur', 'Luminaires design'],
        reasoning: 'Embellir son espace de vie'
      },
      {
        name: 'Lecture et Culture',
        examples: ['Livres', 'Abonnements culturels', 'Liseuse électronique'],
        reasoning: 'Enrichir ses connaissances et s\'évader par la lecture'
      }
    ];
    
    // Filtrer pour éviter de suggérer des catégories déjà présentes
    return allCategories
      .filter(category => !existingCategories.some(
        existing => existing.toLowerCase() === category.name.toLowerCase())
      )
      .slice(0, 4); // Limiter à 4 suggestions
  }
}
