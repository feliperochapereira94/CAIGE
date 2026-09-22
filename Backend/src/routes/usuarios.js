import express from 'express';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/usuariosController.js';
import { requireAuth, requireSupervisor } from '../controllers/acessoController.js';

const router = express.Router();

// Listar usuários (apenas supervisor)
router.get('/', requireAuth, requireSupervisor, listUsers);

// Criar novo usuário (apenas supervisor)
router.post('/', requireAuth, requireSupervisor, createUser);

// Editar usuário (apenas supervisor)
router.put('/:id', requireAuth, requireSupervisor, updateUser);

// Arquivar usuário logicamente (apenas supervisor)
router.delete('/:id', requireAuth, requireSupervisor, deleteUser);

export default router;

