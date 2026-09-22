import express from "express";
import { requireAuth, requireSupervisor } from "../controllers/acessoController.js";
import {
  listArchivedPatients,
  listArchivedUsers,
  recoverArchivedUser,
  recoverArchivedPatient,
  hideArchivedPatient
} from "../controllers/arquivoController.js";

const router = express.Router();

// Listar usuários arquivados/desabilitados
router.get("/usuarios", requireAuth, requireSupervisor, listArchivedUsers);

// Recuperar usuário arquivado
router.post("/usuarios/:id/recuperar", requireAuth, requireSupervisor, recoverArchivedUser);

// Listar pacientes arquivados (oculto = FALSE)
router.get("/pacientes", requireAuth, requireSupervisor, listArchivedPatients);

// Recuperar paciente arquivado para o status inativo
router.post("/pacientes/:id/recuperar", requireAuth, requireSupervisor, recoverArchivedPatient);

// Excluir permanentemente paciente da interface (oculto = TRUE)
router.delete("/pacientes/:id", requireAuth, requireSupervisor, hideArchivedPatient);

export default router;
