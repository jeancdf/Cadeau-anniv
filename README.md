# Application de Liste de Cadeaux avec IA

Une application web complète pour gérer des listes de cadeaux avec des suggestions d'IA via l'API Gemini.

## Structure du projet

Ce projet est organisé en monorepo avec deux dossiers principaux:

- `/frontend` : Application Angular
- `/backend` : API REST Node.js + Express + MongoDB

## Fonctionnalités

### Frontend
- Gestion complète des cadeaux (ajout, modification, suppression)
- Plusieurs niveaux de prix par cadeau
- Réorganisation des cadeaux par priorité via drag & drop
- Suggestions de cadeaux par IA (Gemini)
- Export de la liste au format JSON

### Backend
- API REST complète pour la gestion des cadeaux
- Authentification simple via clé secrète
- Base de données MongoDB

## Installation

### Prérequis
- Node.js (v16+)
- MongoDB
- Clé API Gemini (Google Generative AI)

### Installation du backend
```bash
cd backend
npm install
cp config.env.example config.env # Créer et configurer le fichier .env
```

Configurez les variables d'environnement dans le fichier config.env:
- `MONGO_URI`: URL de connexion MongoDB
- `SECRET_KEY`: Clé secrète pour l'authentification
- `PORT`: Port du serveur (défaut: 3000)

### Installation du frontend
```bash
cd gift-list
npm install
```

Configurez l'API Gemini dans `/src/environments/environment.ts`:
- Remplacez `YOUR_GEMINI_API_KEY` par votre clé API Gemini

## Démarrage

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd gift-list
npm start
```

L'application sera accessible à l'adresse: http://localhost:4200

## Déploiement

### Frontend
Le frontend peut être déployé sur GitHub Pages:

```bash
cd gift-list
ng build --configuration=production
```

### Backend
Le backend peut être déployé sur Render.com. Définissez les variables d'environnement dans le dashboard Render:
- `MONGO_URI`: URL de connexion MongoDB Atlas
- `SECRET_KEY`: Clé secrète pour l'authentification

## Auteur
- Votre Nom

## Licence
MIT 