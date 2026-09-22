import express from "express";
import { getDashboardData } from "../controllers/dadosPainelController.js";
import { requireAuth } from "../controllers/acessoController.js";

const router = express.Router();

router.get("/", requireAuth, getDashboardData);

export default router;

