# Guide débutant de l’affiliation pour Gift Finder

> Guide vérifié le 22 juillet 2026. Les règles, commissions et interfaces des plateformes peuvent changer. Toujours relire les conditions officielles avant une mise en production.

## L’objectif en une phrase

Gift Finder recommande un cadeau, affiche un lien marchand traçable et reçoit une commission si un visiteur réalise un achat éligible après avoir utilisé ce lien.

```text
Utilisateur
   ↓ demande une idée
Gift Finder + IA
   ↓ sélectionne un produit réel
Lien affilié Amazon ou Awin
   ↓ clic puis achat éventuel
Amazon/Awin attribue la vente
   ↓ validation
Commission versée à Gift Finder
```

L’IA ne doit jamais fabriquer l’adresse d’un produit. Elle peut décrire le cadeau recherché et classer des résultats, mais le produit, le prix et le lien doivent toujours provenir d’Amazon, d’Awin ou d’un autre catalogue partenaire officiel.

## Le vocabulaire indispensable

| Mot | Signification simple |
|---|---|
| Éditeur / affilié | Gift Finder : le site qui envoie des visiteurs aux marchands. |
| Annonceur / marchand | La boutique qui vend le produit. |
| Réseau d’affiliation | L’intermédiaire qui fournit le tracking, attribue les ventes et gère les commissions. Awin est un réseau. |
| Lien affilié | Une URL contenant les informations permettant d’attribuer une vente à Gift Finder. |
| Deep link | Un lien affilié qui conduit directement à une fiche produit et non à la page d’accueil du marchand. |
| Tracking ID | Identifiant permettant d’attribuer le clic ou la vente à un compte ou à une campagne. |
| Conversion | Un clic qui produit l’action rémunérée, généralement un achat. |
| Panier moyen | Montant moyen dépensé lors d’une commande. |
| Taux de commission | Pourcentage ou montant gagné sur une vente validée. |
| Flux produit / data feed | Fichier régulièrement actualisé contenant les produits d’un marchand. |
| ASIN | Identifiant d’un produit dans le catalogue Amazon. |

## Amazon et Awin ne jouent pas le même rôle

### Amazon Partenaires

Amazon est à la fois le marchand, le catalogue et le programme d’affiliation. Gift Finder recommande des produits vendus sur Amazon et utilise les liens spéciaux fournis par Amazon.

### Awin

Awin n’est pas une boutique. C’est un réseau reliant Gift Finder à de nombreux marchands. Un seul compte éditeur peut rejoindre plusieurs programmes et utiliser leurs flux produits et leurs liens affiliés.

| Besoin | Amazon | Awin |
|---|---|---|
| Vendre lui-même le produit | Oui, via Amazon.fr | Non |
| Plusieurs marques et marchands | Dans le catalogue Amazon | Oui, plusieurs annonceurs distincts |
| Création manuelle d’un lien | SiteStripe | Link Builder |
| Catalogue automatisable | Creators API, après éligibilité | Flux produits des annonceurs disponibles |
| Lien direct affilié | Lien spécial Amazon | Deep link Awin |
| Validation et paiement | Amazon | Awin après validation du marchand |

---

# Partie 1 — Démarrer avec Amazon Partenaires

## 1. Préparer Gift Finder avant l’inscription

Amazon examine le site déclaré. Avant de déposer la candidature :

- mettre le site en ligne sur son véritable domaine ;
- expliquer clairement ce que fait Gift Finder ;
- avoir des pages accessibles et utilisables ;
- publier suffisamment de contenu original ;
- ajouter une page de confidentialité ;
- ajouter une page de mentions légales ;
- expliquer clairement l’utilisation de liens rémunérés ;
- éviter les pages vides, les faux produits et les liens cassés.

Amazon indique examiner la candidature après au moins **3 ventes éligibles pendant les 180 premiers jours**. Les commandes personnelles ne comptent pas et les sites examinés doivent notamment proposer un contenu original conséquent. Voir la [procédure officielle d’examen](https://partenaires.amazon.fr/help/node/topic/G8TW5AE9XL2VX9VM).

## 2. Créer le compte

1. Ouvrir la [page d’inscription Amazon Partenaires France](https://partenaires.amazon.fr/welcome).
2. Utiliser le compte Amazon du propriétaire de Gift Finder ou créer un compte dédié.
3. Renseigner les informations de paiement et l’identité du bénéficiaire.
4. Déclarer `https://gift-finder.duckdns.org` comme site utilisé pour la promotion.
5. Décrire Gift Finder avec une formulation honnête, par exemple :

   > Gift Finder aide les utilisateurs à créer et partager une liste de cadeaux personnalisée. Le site peut recommander des produits pertinents et rediriger les visiteurs vers des marchands partenaires.

6. Choisir un identifiant Partenaire et un identifiant de suivi compréhensibles.
7. Compléter les informations fiscales et bancaires demandées.

Ne jamais saisir les identifiants secrets Amazon dans le frontend Angular ou dans Git.

## 3. Créer les premiers liens manuellement

Avant l’accès à l’API, utiliser **SiteStripe** :

1. se connecter au compte Amazon associé au programme Partenaires ;
2. ouvrir Amazon.fr ;
3. aller sur une vraie fiche produit ;
4. utiliser la barre SiteStripe affichée en haut de la page ;
5. sélectionner la création d’un lien texte ;
6. choisir le bon identifiant de suivi ;
7. copier le lien généré dans Gift Finder.

SiteStripe ajoute déjà l’identifiant Partenaire au lien. Il permet de créer des liens courts ou longs vers la page consultée. Voir l’[aide officielle SiteStripe](https://partenaires.amazon.fr/help/node/topic/GJMMT7G4C8K4Y3AY).

### Ce qu’il ne faut pas faire

- ajouter soi-même un paramètre `tag` au hasard ;
- inventer un ASIN ;
- utiliser une URL générée par l’IA ;
- acheter par son propre lien ;
- demander à ses proches d’acheter uniquement pour débloquer l’API ;
- annoncer un prix Amazon sans mécanisme autorisé de mise à jour ;
- masquer la destination Amazon derrière une redirection trompeuse ;
- présenter Amazon comme partenaire officiel ou sponsor de Gift Finder.

## 4. Afficher la déclaration obligatoire

Amazon exige une identification claire. La mention prévue par son accord est :

> En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises.

Elle doit être visible sur le site. À proximité d’un lien, utiliser également une formulation claire comme « lien rémunéré par Amazon ». Voir les [obligations d’identification Amazon](https://partenaires.amazon.fr/help/node/topic/GHQNZAU6669EZS98) et le [contrat du programme](https://partenaires.amazon.fr/help/operating/agreement/).

## 5. Comprendre les deux seuils Amazon

Il existe deux étapes différentes :

### Validation initiale du compte

- au moins 3 ventes éligibles ;
- pendant les 180 premiers jours ;
- les commandes personnelles ne sont pas éligibles ;
- Amazon examine ensuite le site et son contenu.

### Accès automatisé au catalogue

La Creators API demande actuellement :

- un compte Amazon Partenaires pour le marché visé ;
- au moins 10 ventes éligibles pendant les 30 derniers jours ;
- une inscription spécifique à l’accès API ;
- la génération d’identifiants API.

Ces conditions sont indiquées dans la [documentation officielle de la Creators API](https://affiliate-program.amazon.com/creatorsapi/docs/).

Les 3 ventes servent donc à l’examen initial du compte. Les 10 ventes récentes servent à l’accès programmatique au catalogue.

## 6. Ce que fera la Creators API

Une fois Gift Finder éligible :

| Opération | Utilisation dans Gift Finder |
|---|---|
| `SearchItems` | Rechercher de vrais produits avec des mots-clés et filtres. |
| `GetItems` | Vérifier un produit et récupérer ses informations par identifiant. |
| `GetVariations` | Trouver les tailles, couleurs ou variantes. |
| `GetBrowseNodes` | Parcourir et filtrer les catégories Amazon. |

Le backend pourra alors rechercher un produit précis, vérifier son ASIN et afficher le lien spécial associé. Qwen pourra classer les résultats retournés, mais ne devra jamais construire lui-même le lien Amazon.

## 7. Secrets Amazon à prévoir plus tard

Les noms exacts dépendront du mécanisme d’authentification final de la Creators API. Utiliser des variables explicites, par exemple :

```dotenv
AMAZON_ASSOCIATE_TAG=gift-finder-21
AMAZON_CREATORS_CREDENTIAL_ID=...
AMAZON_CREATORS_CREDENTIAL_SECRET=...
AMAZON_MARKETPLACE=www.amazon.fr
```

Ces valeurs devront être ajoutées aux secrets GitHub et injectées seulement dans le backend du VPS.

---

# Partie 2 — Démarrer avec Awin

## 1. Comprendre le fonctionnement

Avec Awin, Gift Finder devient un **éditeur**. Les boutiques sont des **annonceurs**.

```text
Gift Finder s’inscrit comme éditeur
            ↓
Recherche et rejoint des programmes marchands
            ↓
Télécharge les flux de leurs produits
            ↓
Affiche les deep links Awin
            ↓
Awin mesure clics et ventes
            ↓
Le marchand valide ou refuse la transaction
            ↓
Awin paie la commission validée
```

## 2. Créer un compte éditeur

1. Ouvrir la [page Awin destinée aux éditeurs](https://www.awin.com/fr/).
2. Choisir l’inscription comme **éditeur/affilié**, pas comme annonceur.
3. Déclarer Gift Finder et son domaine public.
4. Compléter entièrement le profil éditeur : concept, audience, pays et méthode de promotion.
5. Expliquer que le site aide les visiteurs à découvrir puis partager des idées de cadeaux.
6. Effectuer l’éventuel acompte d’inscription indiqué par le formulaire.
7. Attendre l’acceptation du compte.

Awin conseille de détailler le concept et les espaces de promotion, car les annonceurs utilisent le profil pour décider s’ils souhaitent travailler avec l’éditeur. Voir le [guide Awin pour débuter comme éditeur](https://www.awin.com/fr/comment-utiliser-awin/debuter-en-affiliation-avec-awin).

## 3. Rejoindre des annonceurs pertinents

Dans le répertoire Awin :

1. filtrer les programmes disponibles en France ;
2. sélectionner des marchands vendant réellement des cadeaux pertinents ;
3. vérifier qu’ils proposent des deep links ;
4. vérifier qu’ils fournissent un flux produit ;
5. lire leur taux de commission et leurs conditions ;
6. envoyer une demande d’adhésion personnalisée ;
7. attendre le statut `joined` avant de compter sur le programme.

Pour commencer, sélectionner 5 à 10 marchands avec des catalogues propres plutôt que des dizaines de programmes difficiles à maintenir.

Catégories utiles pour Gift Finder :

- technologie et accessoires ;
- livres, culture et loisirs créatifs ;
- sport ;
- beauté et bien-être ;
- maison et décoration ;
- jeux et jouets ;
- expériences et voyages.

## 4. Récupérer les identifiants Awin

### Publisher ID

C’est l’identifiant du compte éditeur Gift Finder. Il est visible dans l’interface Awin.

### Token API

1. ouvrir la page **API Credentials** depuis le menu utilisateur Awin ;
2. confirmer le mot de passe ;
3. afficher puis copier le token personnel ;
4. le stocker comme secret GitHub.

Les API Awin utilisent généralement un Bearer token. Voir la [documentation d’authentification](https://help.awin.com/apidocs/api-authentication).

### Clé des flux produits

Cette clé est différente du token API :

1. ouvrir **Toolbox → Create-a-Feed** ;
2. sélectionner un flux accessible ;
3. générer son URL de téléchargement ;
4. récupérer la clé présente dans cette URL ;
5. télécharger la liste des flux accessibles via l’URL prévue par Awin.

La différence entre la clé des flux et le token API est précisée dans la [documentation Product Feed List Download](https://help.awin.com/developers/docs/product-feed-list-download).

## 5. Secrets Awin nécessaires

Créer ces secrets dans GitHub :

```dotenv
AWIN_PUBLISHER_ID=123456
AWIN_API_TOKEN=...
AWIN_DATAFEED_API_KEY=...
```

Ne jamais :

- les mettre dans `environment.ts` ;
- les envoyer au navigateur ;
- les commiter dans `.env` ;
- les coller dans une issue GitHub ;
- les écrire dans une conversation publique.

Le frontend appelle uniquement le backend Gift Finder. Le backend utilise ensuite les secrets Awin.

## 6. Utiliser les flux produits

Un flux peut notamment fournir :

- nom et identifiant du produit ;
- description ;
- marque et modèle ;
- catégorie ;
- prix et devise ;
- statut de stock ;
- images ;
- URL officielle du marchand ;
- deep link Awin déjà traçable.

Les flux permettent aux éditeurs d’accéder à des millions de produits et à leurs liens directs. Voir la [présentation officielle des flux éditeurs](https://help.awin.com/developers/docs/product-feed-publisher-guide-intro).

Ils ne sont pas un moteur de recherche instantané. Gift Finder devra :

1. télécharger les flux régulièrement ;
2. stocker leurs produits dans PostgreSQL ;
3. indexer noms, marques, catégories et caractéristiques ;
4. rechercher localement les candidats ;
5. retirer les produits absents des nouvelles versions ;
6. conserver la date de dernière mise à jour.

## 7. Utiliser le Link Builder

Si Gift Finder possède déjà l’URL officielle d’un produit et que le marchand autorise les deep links, l’API Link Builder peut générer un lien traçable :

```text
POST /publishers/{publisherId}/linkbuilder/generate
```

La requête contient notamment :

- l’identifiant de l’annonceur ;
- l’URL de destination ;
- éventuellement une référence de clic Gift Finder.

La réponse contient le lien Awin, et éventuellement un lien court. Certains annonceurs peuvent refuser les deep links. Voir l’[API officielle Link Builder](https://help.awin.com/apidocs/generatelink).

## 8. Suivre précisément les clics

Utiliser `clickref` pour associer une visite Awin à un événement interne sans exposer de donnée personnelle :

```text
clickref=gift_83f41a
```

Éviter d’y placer :

- une adresse e-mail ;
- un nom ;
- un numéro de téléphone ;
- le texte de la conversation IA ;
- toute donnée permettant d’identifier directement l’utilisateur.

---

# Partie 3 — Architecture fiable pour Gift Finder

## Principe fondamental

```text
L’IA comprend le besoin
        ↓
Elle produit des critères de recherche structurés
        ↓
Le backend interroge uniquement les catalogues autorisés
        ↓
Des règles déterministes filtrent les produits
        ↓
L’IA classe seulement les produits restants
        ↓
Gift Finder affiche le lien officiel du catalogue
```

Exemple de requête créée par l’IA :

```json
{
  "productType": "casque audio Bluetooth pour le sport",
  "requiredFeatures": ["léger", "résistant à la transpiration"],
  "excludedFeatures": ["casque gaming"],
  "budgetMin": 40,
  "budgetMax": 80,
  "country": "FR",
  "currency": "EUR"
}
```

L’IA ne reçoit pas le droit de remplir un champ `url`.

## Score de confiance recommandé

| Score | Comportement |
|---:|---|
| 88–100 % | Proposer directement le produit, avec possibilité de voir d’autres options. |
| 70–87 % | Afficher jusqu’à trois candidats et demander à l’utilisateur de choisir. |
| Moins de 70 % | Ne pas associer de lien automatiquement. Continuer la conversation ou demander une précision. |

## Conditions obligatoires avant d’afficher une offre

- le produit vient d’un fournisseur autorisé ;
- son lien affilié vient du flux ou de l’API partenaire ;
- le marchand est actif et accepté ;
- le produit est indiqué en vente ;
- la devise et le pays sont compatibles ;
- le prix est dans la fourchette demandée ;
- la marque et le modèle correspondent exactement lorsqu’ils ont été demandés ;
- la dernière mise à jour est suffisamment récente ;
- aucune exclusion exprimée dans le chat n’est contredite.

## Cas où Gift Finder ne doit pas forcer un lien

- idée trop générique : « une expérience mémorable » ;
- produit artisanal sans catalogue partenaire ;
- demande nécessitant une taille ou compatibilité inconnue ;
- aucun résultat avec un bon niveau de confiance ;
- flux trop ancien ;
- produit plus disponible ;
- marchand non accepté dans le programme ;
- lien profond interdit par l’annonceur.

Dans ces cas, afficher « Aucun produit suffisamment fiable trouvé pour le moment » est préférable à une mauvaise recommandation.

---

# Partie 4 — Transparence, cookies et obligations

## Informer sur les liens affiliés

À côté des offres, afficher une mention simple :

> Lien affilié — Gift Finder peut recevoir une commission sans coût supplémentaire pour vous.

Pour les liens Amazon, ajouter la formulation exigée par Amazon indiquée plus haut.

## Consentement aux traceurs

La CNIL précise que les traceurs utilisés pour la facturation des opérations d’affiliation ne bénéficient pas automatiquement d’une exemption de consentement. Voir la [FAQ CNIL, question 13](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ).

Avant d’ajouter des scripts ou cookies d’affiliation sur Gift Finder :

- identifier précisément les traceurs déposés ;
- bloquer les traceurs non nécessaires avant consentement ;
- proposer « Accepter » et « Refuser » avec une facilité équivalente ;
- permettre de retirer le consentement ;
- documenter les partenaires et finalités ;
- demander une validation juridique si le mécanisme de tracking est complexe.

Un simple lien externe et l’ajout de scripts Awin/Amazon dans la page ne doivent pas être considérés comme juridiquement équivalents sans vérification.

## Ne pas favoriser la commission au détriment de l’utilisateur

Le classement doit suivre cet ordre :

1. correspondance avec le besoin ;
2. fiabilité du produit et du lien ;
3. disponibilité ;
4. rapport qualité/prix ;
5. commission, uniquement comme critère secondaire éventuel.

---

# Partie 5 — Plan conseillé pour Gift Finder

## Phase 1 — Obtenir les premières commissions manuellement

- mettre Gift Finder en ligne avec du contenu réel ;
- créer le compte Amazon Partenaires ;
- créer quelques liens Amazon avec SiteStripe ;
- créer le compte éditeur Awin ;
- rejoindre quelques annonceurs pertinents ;
- ajouter manuellement des produits fiables ;
- mesurer les clics et confirmer une première vente attribuée.

## Phase 2 — Automatiser Awin

- obtenir le Publisher ID, le token API et la clé des flux ;
- télécharger uniquement les flux des marchands sélectionnés ;
- construire l’index produits PostgreSQL ;
- ajouter les filtres obligatoires ;
- connecter les suggestions IA au moteur de matching ;
- utiliser les deep links Awin fournis ;
- afficher plusieurs candidats lorsque le score est moyen ;
- ne rien afficher lorsque le score est faible.

## Phase 3 — Ajouter Amazon Creators API

- atteindre les seuils d’éligibilité Amazon ;
- enregistrer Gift Finder pour l’accès API ;
- générer et sécuriser les identifiants ;
- intégrer `SearchItems` et `GetItems` dans le backend ;
- vérifier les règles Amazon relatives aux prix, images et caches ;
- ajouter Amazon comme fournisseur supplémentaire du moteur de recherche.

---

# Checklist avant développement de l’automatisation

## Amazon

- [ ] Compte Amazon Partenaires créé
- [ ] Domaine Gift Finder déclaré
- [ ] Identifiant Partenaire obtenu
- [ ] Mention Amazon affichée
- [ ] Premiers liens SiteStripe testés
- [ ] 3 ventes éligibles réalisées dans les 180 jours
- [ ] Compte examiné et accepté
- [ ] 10 ventes éligibles sur les 30 derniers jours
- [ ] Accès Creators API obtenu
- [ ] Identifiants API placés dans les secrets GitHub

## Awin

- [ ] Compte éditeur créé et accepté
- [ ] Profil Gift Finder complété
- [ ] Publisher ID obtenu
- [ ] Token API obtenu
- [ ] Clé Product Feed obtenue
- [ ] Secrets placés dans GitHub
- [ ] 5 à 10 annonceurs français sélectionnés
- [ ] Programmes rejoints et acceptés
- [ ] Flux produits disponibles
- [ ] Deep links autorisés

## Gift Finder

- [ ] Mention claire près des liens affiliés
- [ ] Politique de confidentialité
- [ ] Gestion du consentement aux traceurs
- [ ] Aucun secret dans le frontend
- [ ] Aucun lien généré par l’IA
- [ ] Produits issus uniquement de catalogues autorisés
- [ ] Date de mise à jour de chaque produit stockée
- [ ] Score de confiance appliqué
- [ ] Aucun lien sous le seuil minimal
- [ ] Clics internes identifiés sans donnée personnelle

---

# Erreurs fréquentes des débutants

1. **Confondre clic et commission** : un clic seul n’est généralement pas rémunéré ; il faut une action ou une vente éligible.
2. **Penser que toutes les ventes sont immédiatement définitives** : elles peuvent rester en attente, être validées ou refusées.
3. **Utiliser ses propres liens** : les achats personnels peuvent être exclus et mettre le compte en danger.
4. **Cacher la nature affiliée du lien** : la transparence est obligatoire et améliore la confiance.
5. **Mettre un token dans Angular** : tout code frontend est récupérable par un visiteur.
6. **Laisser l’IA inventer une URL** : une URL plausible n’est pas la preuve qu’un produit existe.
7. **Afficher un vieux prix** : les catalogues doivent être actualisés et les prix présentés conformément aux règles du fournisseur.
8. **Choisir uniquement la meilleure commission** : une mauvaise recommandation détruit la confiance et la conversion.
9. **Télécharger tous les catalogues immédiatement** : commencer avec quelques marchands de qualité simplifie le matching et la maintenance.
10. **Oublier les refus de consentement** : le site doit rester utilisable selon le choix de l’utilisateur et les obligations applicables.

## Résumé opérationnel

Pour démarrer rapidement :

1. utiliser Amazon SiteStripe pour quelques produits sélectionnés manuellement ;
2. ouvrir parallèlement un compte éditeur Awin ;
3. obtenir les accès aux flux de quelques marchands ;
4. réaliser et vérifier les premières conversions ;
5. automatiser Awin en premier ;
6. ajouter Amazon Creators API une fois les seuils atteints.

Cette approche permet de gagner les premières commissions sans attendre l’API Amazon, tout en empêchant Gift Finder de publier des produits ou liens inventés.
