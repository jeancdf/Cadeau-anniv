# Application de Liste de Cadeaux avec IA

Une application web complète pour gérer des listes de cadeaux avec des suggestions d'IA via Qwen3.7 Plus.

## Structure du projet

Ce projet est organisé en monorepo avec deux dossiers principaux:

- `/gift-list` : application Angular
- `/backend` : API REST Node.js + Express + PostgreSQL (Sequelize)

## Fonctionnalités

### Frontend
- Gestion complète des cadeaux (ajout, modification, suppression)
- Plusieurs niveaux de prix par cadeau
- Réorganisation des cadeaux par priorité via drag & drop
- Suggestions de cadeaux par IA (Qwen3.7 Plus)
- Export de la liste au format JSON
- Recherche, filtres par budget et partage de la liste
- Publication d’une page publique par liste avec liens marchands et suivi affilié optionnel
- Thèmes clair et sombre, interface responsive

### Backend
- API REST complète pour la gestion des cadeaux
- Réorganisation atomique des priorités
- Authentification administrateur par jeton signé et temporaire
- Base de données PostgreSQL

## Installation

### Prérequis
- Node.js (v18+)
- PostgreSQL
- Clé API OpenRouter

### Installation du backend
```bash
cd backend
npm install
cp config.env.example config.env # Créer et configurer le fichier .env
```

Configurez les variables d'environnement dans le fichier `config.env` :
- `DATABASE_URL`: URL de connexion PostgreSQL
- `SECRET_KEY`: Clé longue utilisée pour signer les jetons administrateur
- `ADMIN_PASSWORD`: Mot de passe de l'espace administrateur
- `QWEN_API_KEY`: clé OpenRouter, conservée uniquement côté serveur
- `QWEN_MODEL`: modèle Qwen utilisé par le backend (`qwen/qwen3.7-plus` par défaut)
- `QWEN_BASE_URL`: endpoint compatible OpenAI (`https://openrouter.ai/api/v1` par défaut)
- `PORT`: Port du serveur (défaut: 3000)
- `AMAZON_AFFILIATE_TAG`: identifiant Amazon Partenaires ajouté aux recherches publiques (optionnel)
- `FNAC_AFFILIATE_URL_TEMPLATE` et `CDISCOUNT_AFFILIATE_URL_TEMPLATE`: URLs de redirection partenaire contenant `{url}` et, si nécessaire, `{query}` (optionnel)

### Installation du frontend
```bash
cd gift-list
npm install
```

Le frontend ne nécessite aucun secret. En développement il appelle l'API sur
`http://localhost:3000/api`; en production il utilise `/api` sur le même domaine.

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

Chaque push sur `main` déclenche `.github/workflows/deploy-vps.yml`. La pipeline :

- envoie une archive au compte `deploy` du VPS ;
- construit et démarre Angular, l'API et PostgreSQL avec Docker Compose ;
- conserve PostgreSQL dans le volume nommé `gift-finder_postgres_data` ;
- connecte uniquement le frontend au réseau Caddy `qr-code_app_net` ;
- ajoute de façon idempotente la route HTTPS `gift-finder.duckdns.org` au Caddy
  existant, après sauvegarde et validation de sa configuration ;
- vérifie ensuite `https://gift-finder.duckdns.org/api/health`.

Le backend, PostgreSQL et leurs ports ne sont jamais publiés sur l'hôte.

### Secrets GitHub requis

Dans `Settings > Secrets and variables > Actions`, configurez :

- `VPS_SSH_PRIVATE_KEY` : clé privée du compte VPS `deploy` ;
- `VPS_KNOWN_HOSTS` : entrée `known_hosts` de `51.210.109.16` ;
- `POSTGRES_PASSWORD` : mot de passe de la base interne ;
- `APP_SECRET_KEY` : chaîne aléatoire longue pour signer les jetons ;
- `ADMIN_PASSWORD` : mot de passe de l'espace d'administration ;
- `QWEN_API_KEY` : clé OpenRouter configurée comme secret GitHub.
- `AMAZON_AFFILIATE_TAG`, `FNAC_AFFILIATE_URL_TEMPLATE` et `CDISCOUNT_AFFILIATE_URL_TEMPLATE` : paramètres partenaires facultatifs pour monétiser les liens des listes publiques.

Les variables GitHub `QWEN_MODEL` et `QWEN_BASE_URL` sont facultatives : leurs
valeurs par défaut ciblent déjà `qwen/qwen3.7-plus` sur OpenRouter.

Les valeurs VPS utilisées par défaut sont `51.210.109.16`, utilisateur `deploy` et
port `22`. Elles peuvent être surchargées avec les variables GitHub `VPS_HOST`,
`VPS_USER` et `VPS_PORT`.

### Inspection manuelle du VPS

```bash
ssh -i ~/.ssh/id_ed25519_ovh_deploy deploy@51.210.109.16
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker compose ls
ss -ltn
docker compose --project-name gift-finder \
  --env-file /home/deploy/gift-finder/.env \
  -f /home/deploy/gift-finder/current/docker-compose.prod.yml ps
```

Les versions déployées sont conservées dans `/home/deploy/gift-finder/releases`
et le lien `/home/deploy/gift-finder/current` pointe vers la version active.

## Auteur
- Votre Nom

## Licence
MIT
