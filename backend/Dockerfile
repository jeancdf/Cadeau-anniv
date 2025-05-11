FROM node:18-alpine

WORKDIR /app

# Copier uniquement les fichiers de dépendances pour optimiser le cache Docker
COPY package.json package-lock.json* ./

# Installer les dépendances en mode production
RUN npm install --production

# Copier le reste du code source après l'installation des dépendances
COPY . .

# Utilisateur non-root pour plus de sécurité
USER node

# Exposer le port utilisé par l'application
EXPOSE 3000

# Définir les variables d'environnement
ENV NODE_ENV=production

# Commande de démarrage
CMD ["node", "server.js"] 