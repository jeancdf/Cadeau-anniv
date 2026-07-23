import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import giftRoutes from './routes/gifts.js';
import aiRoutes from './routes/ai.js';
import sharedListRoutes from './routes/shared-lists.js';
import accountRoutes from './routes/account.js';
import statsRoutes from './routes/stats.js';
import { sequelize, testConnection } from './config/database.js';
import { syncGiftModel } from './models/gift.js';
import { syncSharedListModel } from './models/shared-list.js';
import { syncUserModel } from './models/user.js';
import { syncUserSessionModel } from './models/user-session.js';
import { syncGiftClickModel } from './models/gift-click.js';
import { loadOptionalUser } from './services/user-auth.js';

// Charger les variables d'environnement
dotenv.config({ path: './config.env' });

const app = express();
// Production traffic crosses Caddy, then the frontend nginx container.
app.set('trust proxy', 2);
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TOKEN_LIFETIME_MS = 8 * 60 * 60 * 1000;

if (!SECRET_KEY || !ADMIN_PASSWORD) {
  console.error('Erreur de configuration: SECRET_KEY et ADMIN_PASSWORD sont requis');
  process.exit(1);
}

const signTokenPayload = (encodedPayload) => crypto
  .createHmac('sha256', SECRET_KEY)
  .update(encodedPayload)
  .digest('base64url');

const createAdminToken = () => {
  const expiresAt = Date.now() + TOKEN_LIFETIME_MS;
  const encodedPayload = Buffer.from(JSON.stringify({ role: 'admin', expiresAt })).toString('base64url');
  return { token: `${encodedPayload}.${signTokenPayload(encodedPayload)}`, expiresAt };
};

const verifyAdminToken = (token) => {
  try {
    const [encodedPayload, providedSignature] = String(token || '').split('.');
    if (!encodedPayload || !providedSignature) {
      return false;
    }

    const expectedSignature = Buffer.from(signTokenPayload(encodedPayload), 'base64url');
    const receivedSignature = Buffer.from(providedSignature, 'base64url');
    if (expectedSignature.length !== receivedSignature.length
      || !crypto.timingSafeEqual(expectedSignature, receivedSignature)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    return payload.role === 'admin' && Number(payload.expiresAt) > Date.now();
  } catch {
    return false;
  }
};

const passwordsMatch = (providedPassword) => {
  const expectedHash = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  const providedHash = crypto.createHash('sha256').update(String(providedPassword || '')).digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
};

const configuredOrigins = String(process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const isAllowedOrigin = (origin) => !origin
  || configuredOrigins.includes(origin)
  || (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));

// Middleware pour le parsing JSON et CORS
app.use(express.json());
app.use(cors({
  credentials: true,
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin))
}));

// Health check endpoint (sans vérification de clé)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Échanger le mot de passe administrateur contre un jeton signé à durée limitée
app.post('/api/auth/login', (req, res) => {
  if (!passwordsMatch(req.body?.password)) {
    return res.status(401).json({ message: 'Identifiants invalides' });
  }

  res.json(createAdminToken());
});

// Les comptes personnels sont distincts de l'accès administrateur historique.
app.use(loadOptionalUser);
app.use('/api', accountRoutes);

// Les listes partagees utilisent leur propre secret d'edition et restent
// publiques, tout en pouvant être rattachées à un compte personnel.
app.use('/api', sharedListRoutes);

// La lecture de la liste et le nouveau chat de creation restent publics.
// Les mutations d'administration et les anciens outils IA restent proteges.
app.use((req, res, next) => {
  const isPublicGiftList = req.method === 'GET' && req.path === '/api/gifts';
  const isPublicPlannerChat = req.method === 'POST' && req.path === '/api/ai/chat';
  if (isPublicGiftList || isPublicPlannerChat) {
    return next();
  }

  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!verifyAdminToken(token)) {
    return res.status(403).json({ message: 'Accès non autorisé' });
  }

  next();
});

// Routes
app.use('/api', aiRoutes);
app.use('/api', giftRoutes);
app.use('/api', statsRoutes);

// Route de base
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur l\'API de liste de cadeaux' });
});

// Initialisation de la base de données et démarrage du serveur
const initializeServer = async () => {
  try {
    // Tester la connexion à la base de données
    await testConnection();
    
    // Synchroniser les modèles avec la base de données dans l'ordre des dépendances.
    await syncUserModel();
    await syncUserSessionModel();
    await Promise.all([syncGiftModel(), syncSharedListModel()]);
    await syncGiftClickModel();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du serveur:', error);
    process.exit(1);
  }
};

// Démarrer le serveur
initializeServer();

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('Erreur non gérée:', err);
});
