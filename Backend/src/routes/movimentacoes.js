import express from 'express';
import { requireAuth } from '../controllers/acessoController.js';
import { getMovimentacoesRecentes } from '../controllers/movimentacoesController.js';

const router = express.Router();

/**
 * GET /movimentacoes/recentes
 * Obtém movimentações recentes com paginação e filtros
 */
router.get('/recentes', requireAuth, getMovimentacoesRecentes);

export default router;
