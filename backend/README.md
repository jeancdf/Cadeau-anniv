# Backend de l'application Liste de Cadeaux

Ce backend Node.js/Express fournit les API pour l'application Liste de Cadeaux, avec PostgreSQL comme base de données.

## Configuration pour le déploiement sur Render

### Prérequis

- Un compte [Render](https://render.com)
- Les bases de données PostgreSQL sont automatiquement gérées par Render

### Instructions de déploiement

1. Connectez-vous à votre compte Render

2. Créez un nouveau service Web:
   - Depuis le tableau de bord, cliquez sur "New +" puis "Web Service"
   - Connectez votre dépôt GitHub
   - Choisissez le dépôt contenant ce projet

3. Configurez le service:
   - **Nom**: `cadeau-anniv-backend` (ou le nom de votre choix)
   - **Environnement**: Docker
   - **Dossier racine**: `backend`
   - **Dockerfile Path**: `./Dockerfile`
   - **Branche**: `main` (ou votre branche principale)
   - **Plan**: Free (ou autre selon votre choix)
   - **Région**: Frankfurt (Europe) ou autre selon votre préférence

4. Créez une base de données PostgreSQL:
   - Depuis le tableau de bord, cliquez sur "New +" puis "PostgreSQL"
   - Remplissez les détails nécessaires (nom, région, etc.)
   - Notez la chaîne de connexion fournie

5. Configurez les variables d'environnement pour le service Web:
   - `NODE_ENV`: production
   - `PORT`: 3000
   - `DATABASE_URL`: La chaîne de connexion PostgreSQL (automatiquement liée si vous utilisez render.yaml)
   - `SECRET_KEY`: clé longue utilisée pour signer les jetons administrateur
   - `ADMIN_PASSWORD`: mot de passe de l'espace administrateur
   - `QWEN_API_KEY`: clé OpenRouter, jamais exposée au frontend
   - `QWEN_MODEL`: modèle Qwen à utiliser (`qwen/qwen3.7-plus` par défaut)
   - `QWEN_BASE_URL`: endpoint compatible OpenAI d'OpenRouter

6. Déployez le service en cliquant sur "Create Web Service"

## Déploiement avec render.yaml

Pour simplifier le déploiement, vous pouvez utiliser le fichier `render.yaml` présent à la racine du projet:

1. Dans le tableau de bord Render, cliquez sur "New +" puis "Blueprint"
2. Sélectionnez votre dépôt GitHub
3. Render va automatiquement détecter le fichier render.yaml et configurer les services

## Configuration locale

1. Installez PostgreSQL sur votre machine ou utilisez un service Docker

2. Créez un fichier `config.env` dans le répertoire `backend` avec:
   ```
   PORT=3000
   DATABASE_URL=postgres://username:password@localhost:5432/gift-list
   SECRET_KEY=votre_clé_secrète
   ADMIN_PASSWORD=votre_mot_de_passe
   QWEN_API_KEY=votre_clé_openrouter
   QWEN_MODEL=qwen/qwen3.7-plus
   QWEN_BASE_URL=https://openrouter.ai/api/v1
   ```

3. Installez les dépendances:
   ```
   npm install
   ```

4. Démarrez le serveur:
   ```
   node server.js
   ```

## Structure du projet

- `server.js` - Point d'entrée de l'application
- `config/database.js` - Configuration de la connexion PostgreSQL
- `models/Gift.js` - Modèle Sequelize pour les cadeaux
- `routes/` - Définitions des routes API
- `Dockerfile` - Configuration pour le déploiement Docker

## Points d'API

- `GET /api/health` - Vérification de l'état du serveur
- `POST /api/auth/login` - Connexion administrateur
- `GET /api/gifts` - Récupérer tous les cadeaux
- `POST /api/gifts` - Ajouter un nouveau cadeau
- `PUT /api/gifts/:id` - Mettre à jour un cadeau
- `DELETE /api/gifts/:id` - Supprimer un cadeau
- `GET /api/export` - Exporter tous les cadeaux au format JSON
- `POST /api/ai/generate` - Générer des suggestions via le proxy Qwen
