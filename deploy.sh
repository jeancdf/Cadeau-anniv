#!/bin/bash

# Script de déclenchement du déploiement Gift Finder

echo "=== Déploiement de l'application Cadeau-anniv ==="
echo ""

# Vérification des modifications non commitées
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️ Vous avez des modifications non commitées. Veuillez les commiter avant de déployer."
  git status
  exit 1
fi

# Push vers GitHub (déclenche la pipeline VPS)
echo "🚀 Push des modifications vers GitHub..."
git push origin main

echo ""
echo "✅ Push terminé!"
echo ""
echo "🔄 La pipeline GitHub Actions déploie maintenant l'application complète sur le VPS."
echo "🌐 URL cible: https://gift-finder.duckdns.org"
echo "📋 Suivi: https://github.com/jeancdf/Cadeau-anniv/actions"
echo ""
echo "=== Script terminé ===" 
