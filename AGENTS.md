# Consignes pour les agents

## Proxy HTTPS partagé

Le seul propriétaire de Caddy est le dépôt privé [jeancdf/caddy-config](https://github.com/jeancdf/caddy-config), projet Compose `vps-caddy`.

- Ce dépôt applicatif ne doit ni modifier les routes ou fichiers de Caddy, ni recréer/recharger/supprimer son conteneur, ni connecter/déconnecter ses réseaux.
- Ne jamais écrire `/home/deploy/qr-compose.prod.yml`, `/etc/caddy` ou `/data/lsc-preprod`. Ne jamais supprimer les volumes de certificats.
- Toute modification de domaine, destination ou réseau du proxy passe par une PR dans `caddy-config` et sa pipeline. Les applications gardent leurs services, données et déploiements propres.
- Les scripts applicatifs vérifient en lecture seule le proxy (projet `qr-code` avant migration, `vps-caddy`/`proxy` après), ses routes et réseaux, sans jamais bloquer ni écrire. Ne jamais ajouter d’écriture Caddy.
- La migration initiale nécessite l’approbation explicite du propriétaire. Préparer les PR des anciens propriétaires et neutraliser leurs pipelines avant la bascule. Ne pas déployer une application pour effectuer cette migration.
- Préserver toutes les modifications locales sans rapport. Ne pas fusionner sur `main` ni lancer un déploiement de production sans demande explicite du propriétaire. SSH sert uniquement à lire et diagnostiquer pour les agents.
