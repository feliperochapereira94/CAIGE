import jwt from "jsonwebtoken";

const DEFAULT_JWT_EXPIRES_IN = "8h";

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!secret) {
    throw new Error("JWT_SECRET nao configurado no ambiente");
  }

  return secret;
}

function getJwtExpiresIn() {
  return String(process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN).trim() || DEFAULT_JWT_EXPIRES_IN;
}

export function signAccessToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
    issuer: "caige-api"
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "caige-api"
  });
}

export function getTokenTtl() {
  return getJwtExpiresIn();
}
