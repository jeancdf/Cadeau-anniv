import crypto from 'crypto';
import { promisify } from 'util';
import { User } from '../models/user.js';
import { UserSession } from '../models/user-session.js';

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = 'gift_finder_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const readCookie = (cookieHeader, name) => {
  const cookies = String(cookieHeader || '').split(';');
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }
    const key = cookie.slice(0, separatorIndex).trim();
    if (key !== name) {
      continue;
    }
    try {
      return decodeURIComponent(cookie.slice(separatorIndex + 1).trim());
    } catch {
      return '';
    }
  }
  return '';
};

const sessionCookie = (token, maxAgeSeconds) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
};

export const normalizeEmail = (value) => String(value || '').trim().toLocaleLowerCase('fr').slice(0, 254);

export const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  createdAt: user.createdAt
});

export const createPasswordCredentials = async (password) => {
  const passwordSalt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(String(password), passwordSalt, 64);
  return {
    passwordSalt,
    passwordHash: Buffer.from(derivedKey).toString('hex')
  };
};

export const passwordMatches = async (password, user) => {
  try {
    const derivedKey = Buffer.from(await scrypt(String(password), user.passwordSalt, 64));
    const expectedKey = Buffer.from(user.passwordHash, 'hex');
    return derivedKey.length === expectedKey.length && crypto.timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
};

export const createUserSession = async (user, res) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await UserSession.create({
    tokenHash: hashToken(token),
    userId: user.id,
    expiresAt
  });
  res.setHeader('Set-Cookie', sessionCookie(token, Math.floor(SESSION_DURATION_MS / 1000)));
};

export const clearUserSession = async (req, res) => {
  const token = readCookie(req.headers.cookie, SESSION_COOKIE);
  if (token) {
    await UserSession.destroy({ where: { tokenHash: hashToken(token) } });
  }
  res.setHeader('Set-Cookie', sessionCookie('', 0));
};

export const loadOptionalUser = async (req, _res, next) => {
  try {
    req.user = null;
    req.userSession = null;
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    if (!token) {
      return next();
    }

    const session = await UserSession.findOne({ where: { tokenHash: hashToken(token) } });
    if (!session) {
      return next();
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await session.destroy();
      return next();
    }

    const user = await User.findByPk(session.userId);
    if (!user) {
      await session.destroy();
      return next();
    }

    req.user = user;
    req.userSession = session;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Connectez-vous pour accéder à cet espace' });
  }
  return next();
};
