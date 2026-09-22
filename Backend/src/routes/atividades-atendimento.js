import express from 'express';
import {
  listarAtividadesAtendimento,
  listarAtividadesPorCurso,
  obterAtividadeAtendimento,
  criarAtividadeAtendimento,
  atualizarAtividadeAtendimento,
  excluirAtividadeAtendimento
} from '../controllers/atividadesAtendimentoController.js';
import { requireAuth, requirePermission } from '../controllers/acessoController.js';

const router = express.Router();
const gerenciar = [requireAuth, requirePermission('pode_gerenciar_atividades')];

router.get('/', requireAuth, listarAtividadesAtendimento);
router.get('/curso/:idCurso', requireAuth, listarAtividadesPorCurso);
router.get('/:id', requireAuth, obterAtividadeAtendimento);
router.post('/', ...gerenciar, criarAtividadeAtendimento);
router.put('/:id', ...gerenciar, atualizarAtividadeAtendimento);
router.delete('/:id', ...gerenciar, excluirAtividadeAtendimento);

export default router;