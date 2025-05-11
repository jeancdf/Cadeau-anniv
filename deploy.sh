#!/bin/bash

# Script de déploiement pour l'application Cadeau-anniv

echo "=== Déploiement de l'application Cadeau-anniv ==="
echo ""

# Vérification des modifications non commitées
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️ Vous avez des modifications non commitées. Veuillez les commiter avant de déployer."
  git status
  exit 1
fi

# Push vers GitHub (déclenchera le déploiement automatique sur Render)
echo "🚀 Push des modifications vers GitHub..."
git push origin main

echo ""
echo "✅ Push terminé!"
echo ""
echo "🔄 Le déploiement backend sur Render devrait démarrer automatiquement."
echo ""
echo "Pour déployer le frontend sur Vercel ou Netlify:"
echo "1. Construisez l'application Angular:"
echo "   cd gift-list && npm run build --prod"
echo ""
echo "2. Déployez le contenu du dossier 'gift-list/dist/gift-list' sur votre plateforme préférée"
echo ""
echo "=== Script terminé ===" 