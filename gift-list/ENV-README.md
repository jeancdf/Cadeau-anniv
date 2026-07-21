# Variables d'environnement

Le frontend ne contient plus de secret. En développement, il appelle
`http://localhost:3000/api`; en production, il utilise `/api` sur le même domaine.

Les secrets sont configurés uniquement dans `backend/config.env` ou dans le fichier
`.env` Docker du VPS :

```dotenv
DATABASE_URL=postgres://postgres:mot-de-passe@localhost:5432/gift_list
SECRET_KEY=une-cle-longue-et-aleatoire
ADMIN_PASSWORD=un-mot-de-passe-administrateur
QWEN_API_KEY=votre-cle-api-openrouter
QWEN_MODEL=qwen/qwen3.7-plus
QWEN_BASE_URL=https://openrouter.ai/api/v1
```

Ne commitez jamais ces valeurs. La clé Gemini auparavant présente dans le dépôt doit
être révoquée et remplacée, car supprimer sa valeur du code ne l'efface pas de
l'historique Git.
