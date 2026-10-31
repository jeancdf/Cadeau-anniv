# Migration vers le proxy dédié

Le proxy HTTPS est géré exclusivement dans le dépôt privé [jeancdf/caddy-config](https://github.com/jeancdf/caddy-config), projet Compose `vps-caddy`, conteneur `qr_caddy`. Ce dépôt applicatif ne modifie plus sa configuration, ses réseaux, ses volumes ou son cycle de vie, y compris en cas d’échec ou de repli applicatif.

Les déploiements exécutent, avant le build, un contrôle **en lecture seule et non bloquant** : il accepte le proxy `qr_caddy` encore dans le projet `qr-code` (avant migration) ou dans `vps-caddy`/`proxy` (après), vérifie état, réseaux et routes, et n’émet qu’un avertissement en cas d’écart. Le bloquant reste le contrôle de santé public. Aucune écriture, aucun rechargement, aucune recréation du proxy.

## Ordre de migration à approuver

1. Revoir les PR dans `caddy-config`, `qr-code`, `Cadeau-anniv`, `Blood-tower` et `atelier-ia`. Les PR applicatives ne doivent déclencher aucun déploiement de production pendant la préparation.
2. Avant la bascule, neutraliser les anciens workflows/scripts capables d’écrire le proxy et rendre effectives leurs versions sans ces écritures. Une PR ouverte ou une branche poussée ne retire pas les anciens écrivains. Geler les déploiements automatiques pendant cette opération ; ne pas lancer de déploiement applicatif pour migrer Caddy.
3. Après approbation explicite du propriétaire, exécuter uniquement la migration initiale du dépôt dédié. Préserver les volumes de certificats existants, toutes les routes et les réseaux externes.
4. Vérifier les seize domaines et les destinations. Les déploiements applicatifs pourront ensuite reprendre avec leur contrôle en lecture seule. Les rechargements et replis du proxy restent dans `caddy-config`.

Cette PR prépare les fichiers et les contrôles : elle ne fusionne rien sur `main`, ne lance aucun workflow de production et ne modifie pas le VPS. Le déploiement fonctionne avant et après la migration.

## Vérification locale

```sh
python -m unittest discover -s tests -p test_proxy_isolation.py
```

Les tests couvrent le propriétaire historique refusé, un proxy arrêté, les réseaux manquants, les routes absentes/erronées, le refus de combiner des routes sœurs, les erreurs Docker/JSON sans fuite de configuration, et l’absence d’écritures historiques dans les scripts runtime/manuels/repli et workflows. La CI vérifie aussi la syntaxe Bash et le Compose sans connexion au VPS. Les services/données applicatifs restent définis dans leur Compose.
