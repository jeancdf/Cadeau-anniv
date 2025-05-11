# Variables d'environnement pour Gift-List

## Configuration

1. Créez un fichier `.env` à la racine du dossier `gift-list` avec les variables suivantes :

```
GEMINI_API_KEY=votre-cle-api-gemini
GEMINI_MODEL=gemini-2.5-pro-exp-03-25
SECRET_KEY=votre-secret-key-de-production
```

2. Ces valeurs seront automatiquement injectées dans les fichiers d'environnement lors du build.

## Utilisation

- Pour le développement local : créez simplement le fichier `.env`
- Pour la production : configurez ces variables sur votre plateforme de déploiement

## Valeurs par défaut

Si le fichier `.env` n'existe pas ou si certaines variables ne sont pas définies, les valeurs par défaut suivantes seront utilisées :

- `GEMINI_API_KEY`: AIzaSyByahoGsqsWe6qkq_VVam8DGyRlS5xuOmA
- `GEMINI_MODEL`: gemini-2.5-pro-exp-03-25
- `SECRET_KEY`: dev-secret-key (en développement uniquement)

## Construction avec variables d'environnement

Pour construire l'application avec les variables d'environnement :

```bash
npm run build:prod
```

Ce script exécute `set-env.js` avant la compilation, qui remplace les variables dans les fichiers d'environnement. 