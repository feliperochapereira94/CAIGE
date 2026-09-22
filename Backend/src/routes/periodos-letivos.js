import express from 'express';
import { requireAuth, requireSupervisor } from '../controllers/acessoController.js';
import {
  listarPeriodosLetivos,
  criarPeriodoLetivo,
  atualizarPeriodoLetivo,
  listarGradePeriodo,
  salvarDiasGrade,
  listarExcecoesPeriodo,
  criarExcecaoPeriodo,
  removerExcecaoPeriodo,
  copiarPeriodoLetivo,
  enviarPeriodoParaHistorico
} from '../controllers/periodosLetivosController.js';

const router = express.Router();

router.get('/', requireAuth, requireSupervisor, listarPeriodosLetivos);
router.post('/', requireAuth, requireSupervisor, criarPeriodoLetivo);
router.put('/:id', requireAuth, requireSupervisor, atualizarPeriodoLetivo);
router.post('/:id/copiar', requireAuth, requireSupervisor, copiarPeriodoLetivo);
router.post('/:id/historico', requireAuth, requireSupervisor, enviarPeriodoParaHistorico);

router.get('/:id/grade', requireAuth, requireSupervisor, listarGradePeriodo);
router.put('/:id/grade', requireAuth, requireSupervisor, salvarDiasGrade);

router.get('/:id/excecoes', requireAuth, requireSupervisor, listarExcecoesPeriodo);
router.post('/:id/excecoes', requireAuth, requireSupervisor, criarExcecaoPeriodo);
router.delete('/:id/excecoes/:idExcecao', requireAuth, requireSupervisor, removerExcecaoPeriodo);

export default router;
