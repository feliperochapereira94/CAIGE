import express from 'express';
import { frequenciaController } from '../controllers/frequenciaController.js';
import { requireAuth, requirePermission } from '../controllers/acessoController.js';

const router = express.Router();

// Listar historico - qualquer autenticado
router.get('/historico', requireAuth, frequenciaController.getHistory);

// Relatorio de frequencia - requer permissao pode_visualizar_relatorios
router.get('/relatorio', requireAuth, requirePermission('pode_visualizar_relatorios'), frequenciaController.getFrequencyReport);

router.get('/contexto', requireAuth, frequenciaController.getContext);
router.post('/', requireAuth, requirePermission('pode_registrar_frequencia'), frequenciaController.criarFrequencia);

export default router;

