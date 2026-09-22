import pool from "../models/database.js";
import { resolvePermissionColumn } from "../models/esquemaModel.js";
import { verifyAccessToken } from "../models/tokenModel.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ message: "Token Bearer obrigatorio" });
    }

    const decoded = verifyAccessToken(match[1]);
    const userEmail = decoded?.email || null;

    if (!userEmail) {
      return res.status(401).json({ message: "Nao autenticado" });
    }

    const [users] = await pool.query(
      `SELECT id, email, nome AS name, papel AS role, id_curso AS course_id,
              ativo AS is_active, oculto AS is_hidden
       FROM usuarios
       WHERE email = ?
       LIMIT 1`,
      [userEmail]
    );

    if (!users[0]) {
      return res.status(401).json({ message: "Usuario nao encontrado" });
    }

    const isActive = users[0].is_active === 1 || users[0].is_active === true;
    const isHidden = users[0].is_hidden === 1 || users[0].is_hidden === true;

    if (!isActive || isHidden) {
      return res.status(401).json({ message: "Usuario inativo ou indisponivel" });
    }

    req.user = {
      id: users[0].id,
      email: users[0].email,
      name: users[0].name,
      role: users[0].role,
      idCurso: users[0].course_id
    };
    req.headers["x-user-email"] = users[0].email;
    next();
  } catch (error) {
    if (error?.name === "TokenExpiredError" || error?.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token invalido ou expirado" });
    }
    console.error("Erro em autenticacao:", error);
    res.status(500).json({ message: "Erro ao verificar autenticacao" });
  }
}

export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nao autenticado" });
      }

      const permissionColumn = await resolvePermissionColumn(permission);
      const [perms] = await pool.query(
        `SELECT ${permissionColumn} FROM permissoes WHERE papel = ?`,
        [req.user.role]
      );

      if (!perms[0] || !perms[0][permissionColumn]) {
        return res.status(403).json({ message: "Permissao negada" });
      }

      next();
    } catch (error) {
      console.error("Erro ao verificar permissao:", error);
      res.status(500).json({ message: "Erro ao verificar permissao" });
    }
  };
}

export async function requireSupervisor(req, res, next) {
  try {
    if (!req.user || req.user.role !== "SUPERVISOR") {
      return res.status(403).json({ message: "Apenas supervisores podem acessar" });
    }
    next();
  } catch (error) {
    console.error("Erro ao verificar supervisor:", error);
    res.status(500).json({ message: "Erro ao verificar supervisor" });
  }
}

