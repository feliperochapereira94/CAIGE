import bcryptjs from 'bcryptjs';
import pool from '../models/database.js';
import { registrarMovimentacao } from '../models/movimentacoesModel.js';
import { parsePositiveInt } from '../models/validacaoModel.js';

const EMAIL_DOMAIN = '@univale.br';
const SYSTEM_SUPPORT_EMAIL = 'suportecaige@univale.br';
const NOME_SOMENTE_LETRAS = /^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u;
function nomeSomenteLetras(valor) { return NOME_SOMENTE_LETRAS.test(String(valor || '').trim()); }


function normalizarPapel(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const papel = String(valor).trim().toUpperCase();
  return ['SUPERVISOR', 'PROFESSOR'].includes(papel) ? papel : null;
}

function normalizarBooleanoOpcional(valor) {
  if (valor === undefined) return { informado: false, valor: null };
  if (valor === true || valor === 1 || valor === '1' || valor === 'true') return { informado: true, valor: true };
  if (valor === false || valor === 0 || valor === '0' || valor === 'false') return { informado: true, valor: false };
  return { informado: true, valor: null };
}


function isProtectedSystemUser(user) {
  return String(user?.email || '').trim().toLowerCase() === SYSTEM_SUPPORT_EMAIL;
}

function protectedUserMessage() {
  return 'O usuário Suporte CAIGE é uma conta protegida do sistema e não pode ser desativado, excluído ou perder o perfil de Supervisor.';
}

// Listar usuários (apenas supervisor)
export async function listUsers(req, res) {
  try {
    const [users] = await pool.query(
      `SELECT id, email, nome, papel, id_curso AS idCurso, criado_por AS criadoPor, ativo,
              criado_em AS criadoEm,
              CASE WHEN LOWER(email) = ? THEN TRUE ELSE FALSE END AS protegidoSistema
         FROM usuarios
        WHERE oculto = FALSE OR oculto IS NULL
        ORDER BY nome`,
      [SYSTEM_SUPPORT_EMAIL]
    );
    res.json(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
}

// Criar novo usuário (apenas supervisor)
export async function createUser(req, res) {
  try {
    const { email, password, nome, papel = 'PROFESSOR', idCurso } = req.body;
    const userEmail = req.user?.email;
    const userRole = req.user?.role;
    const emailNormalizado = String(email || '').trim().toLowerCase();
    const papelNormalizado = normalizarPapel(papel);
    const idCursoNormalizado = idCurso ? parsePositiveInt(idCurso) : null;

    if (!emailNormalizado || !password || !nome) {
      return res.status(400).json({ message: 'Email, senha e nome são obrigatórios' });
    }

    if (!nomeSomenteLetras(nome)) {
      return res.status(400).json({ message: 'O nome deve conter somente letras.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    if (!emailNormalizado.endsWith(EMAIL_DOMAIN)) {
      return res.status(400).json({ message: 'Use um e-mail institucional @univale.br' });
    }

    if (userRole !== 'SUPERVISOR') {
      return res.status(403).json({ message: 'Apenas supervisores podem criar usuários' });
    }

    // Validar papel
    if (!papelNormalizado) {
      return res.status(400).json({ message: 'Papel inválido' });
    }

    // Validar que professor deve ter curso
    if (papelNormalizado === 'PROFESSOR' && !idCursoNormalizado) {
      return res.status(400).json({ message: 'O curso é obrigatório para usuários com perfil de professor.' });
    }

    // Validar que o curso existe
    if (idCursoNormalizado) {
      const [cursos] = await pool.query('SELECT id FROM cursos WHERE id = ? AND ativo = TRUE', [idCursoNormalizado]);
      if (!cursos.length) {
        return res.status(400).json({ message: 'Curso informado não existe ou está inativo.' });
      }
    }

    // Buscar o usuário criador
    const [creator] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [userEmail]);
    const creatorId = creator[0]?.id;

    // Hash da senha
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Inserir novo usuário
    const [result] = await pool.query(
      'INSERT INTO usuarios (email, senha_hash, nome, papel, id_curso, criado_por, ativo) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
      [emailNormalizado, hashedPassword, nome.trim(), papelNormalizado, papelNormalizado === 'PROFESSOR' ? idCursoNormalizado : null, creatorId]
    );

    await registrarMovimentacao({
      id_usuario: req.user?.id || creatorId || null,
      tipo: 'Usuário criado',
      descricao: `Novo usuário criado: ${nome} (${emailNormalizado}) - ${papelNormalizado}`
    });

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    res.status(500).json({ message: 'Erro ao criar usuário' });
  }
}

// Editar usuário (apenas supervisor)
export async function updateUser(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);
    const { email, nome, papel, idCurso, ativo, novaSenha, senhaSupervisor } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID de usuário inválido' });
    }

    const [currentRows] = await pool.query(
      'SELECT email, nome, papel, id_curso AS idCurso, ativo FROM usuarios WHERE id = ? LIMIT 1',
      [id]
    );

    if (!currentRows.length) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const currentUser = currentRows[0];
    const emailNormalizado = email !== undefined ? String(email).trim().toLowerCase() : currentUser.email;
    const papelNormalizado = papel !== undefined ? normalizarPapel(papel) : currentUser.papel;
    const ativoNormalizado = normalizarBooleanoOpcional(ativo);

    if (email !== undefined) {
      if (!emailNormalizado || !emailNormalizado.endsWith(EMAIL_DOMAIN)) {
        return res.status(400).json({ message: 'Use um e-mail institucional @univale.br' });
      }
    }

    if (!papelNormalizado) {
      return res.status(400).json({ message: 'Papel inválido' });
    }

    if (ativoNormalizado.informado && ativoNormalizado.valor === null) {
      return res.status(400).json({ message: 'Status ativo inválido' });
    }

    let idCursoFinal = currentUser.idCurso ? Number(currentUser.idCurso) : null;
    if (papelNormalizado === 'SUPERVISOR') {
      idCursoFinal = null;
    } else {
      if (idCurso !== undefined) {
        idCursoFinal = idCurso ? parsePositiveInt(idCurso) : null;
      }
      if (!idCursoFinal) {
        return res.status(400).json({ message: 'O curso é obrigatório para usuários com perfil de professor.' });
      }
      const [cursos] = await pool.query('SELECT id FROM cursos WHERE id = ? AND ativo = TRUE', [idCursoFinal]);
      if (!cursos.length) {
        return res.status(400).json({ message: 'Curso informado não existe ou está inativo.' });
      }
    }

    if (isProtectedSystemUser(currentUser)) {
      const novoAtivo = ativoNormalizado.informado ? ativoNormalizado.valor : Boolean(currentUser.ativo);

      if (
        emailNormalizado !== SYSTEM_SUPPORT_EMAIL ||
        papelNormalizado !== 'SUPERVISOR' ||
        !novoAtivo ||
        idCursoFinal !== null
      ) {
        return res.status(409).json({ message: protectedUserMessage() });
      }
    }

    const nomeNormalizado = nome !== undefined && nome !== null ? String(nome).trim() : null;
    if (nomeNormalizado !== null && !nomeSomenteLetras(nomeNormalizado)) {
      return res.status(400).json({ message: 'O nome deve conter somente letras.' });
    }
    const alterouNome = nomeNormalizado !== null && nomeNormalizado !== currentUser.nome;
    const alterouSenha = typeof novaSenha === 'string' && novaSenha.length > 0;

    if (alterouSenha && novaSenha.length < 6) {
      return res.status(400).json({ message: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    if (alterouNome || alterouSenha) {
      if (!senhaSupervisor) {
        return res.status(403).json({ message: 'Confirme a senha do supervisor para concluir esta alteração.' });
      }

      const [supervisorRows] = await pool.query(
        "SELECT senha_hash AS passwordHash FROM usuarios WHERE id = ? AND papel = 'SUPERVISOR' AND ativo = TRUE AND oculto = FALSE LIMIT 1",
        [req.user?.id]
      );

      const senhaValida =
        supervisorRows.length > 0 &&
        await bcryptjs.compare(senhaSupervisor, supervisorRows[0].passwordHash);

      if (!senhaValida) {
        return res.status(401).json({ message: 'Senha do supervisor inválida.' });
      }
    }

    const updates = [];
    const values = [];

    if (email !== undefined) {
      updates.push('email = ?');
      values.push(emailNormalizado);
    }

    if (nomeNormalizado !== null) {
      updates.push('nome = ?');
      values.push(nomeNormalizado);
    }

    if (papel !== undefined) {
      updates.push('papel = ?');
      values.push(papelNormalizado);
    }

    if (idCurso !== undefined || papel !== undefined) {
      updates.push('id_curso = ?');
      values.push(idCursoFinal);
    }

    if (ativoNormalizado.informado) {
      updates.push('ativo = ?');
      values.push(ativoNormalizado.valor);
    }

    if (alterouSenha) {
      const novaSenhaHash = await bcryptjs.hash(novaSenha, 10);
      updates.push('senha_hash = ?');
      values.push(novaSenhaHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    values.push(id);

    await pool.query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const alteracoesSensiveis = [];
    if (alterouNome) alteracoesSensiveis.push('nome');
    if (alterouSenha) alteracoesSensiveis.push('senha');

    const activityDescription = alteracoesSensiveis.length
      ? `${req.user?.name || req.user?.email} atualizou ${alteracoesSensiveis.join(' e ')} do usuário ${currentUser.email}.`
      : `Usuário atualizado: ${nomeNormalizado || emailNormalizado || currentUser.email}`;

    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      tipo: 'Usuário atualizado',
      descricao: activityDescription
    });

    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
}

// Arquivar usuário de forma lógica (sem excluir do banco)
export async function deleteUser(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'ID de usuário inválido' });
    }

    const [userRows] = await pool.query(
      'SELECT email, ativo, oculto FROM usuarios WHERE id = ? LIMIT 1',
      [id]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const usuario = userRows[0];
    const deletedEmail = usuario.email;

    if (isProtectedSystemUser(usuario)) {
      return res.status(409).json({ message: protectedUserMessage() });
    }

    if (usuario.oculto === true || usuario.oculto === 1) {
      return res.status(400).json({ message: 'Este usuário já está arquivado.' });
    }

    if (usuario.ativo === true || usuario.ativo === 1) {
      return res.status(409).json({ message: 'Desative o usuário antes de arquivá-lo.' });
    }

    await pool.query(
      'UPDATE usuarios SET ativo = FALSE, oculto = TRUE WHERE id = ?',
      [id]
    );

    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      tipo: 'Usuário arquivado',
      descricao: `Usuário arquivado: ${deletedEmail}`
    });

    res.json({ message: 'Usuário arquivado com sucesso' });
  } catch (error) {
    console.error('Erro ao arquivar usuário:', error);
    res.status(500).json({ message: 'Erro ao arquivar usuário' });
  }
}
