import express from "express";
import { login, changePassword, confirmPassword, getUserProfile, updateUserProfile } from "../controllers/autenticacaoController.js";
import { requireAuth } from "../controllers/acessoController.js";

const router = express.Router();

router.post("/entrar", login);
router.post("/alterar-senha", requireAuth, changePassword);
router.post("/confirmar-senha", requireAuth, confirmPassword);
router.get("/perfil", requireAuth, getUserProfile);
router.put("/perfil", requireAuth, updateUserProfile);

export default router;

