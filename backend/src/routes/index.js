import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

export const registerRoutes = (io) => {
  const router = express.Router();

  router.post('/auth/register', async (req, res) => {
    try {
      const { name, email, password, role = 'resident', city, neighborhood, phone } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
      }

      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rowCount > 0) {
        return res.status(409).json({ message: 'E-mail já cadastrado.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await query(
        `INSERT INTO users (name, email, password_hash, role, city, neighborhood, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, email, role, city, neighborhood, phone, created_at`,
        [name, email, passwordHash, role, city || null, neighborhood || null, phone || null]
      );

      const user = result.rows[0];
      const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET || 'supersecretkey', {
        expiresIn: '7d',
      });

      return res.status(201).json({ token, user });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  router.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
      }

      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ message: 'Credenciais inválidas.' });
      }

      const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET || 'supersecretkey', {
        expiresIn: '7d',
      });

      const publicUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        city: user.city,
        neighborhood: user.neighborhood,
        phone: user.phone,
      };

      return res.json({ token, user: publicUser });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  router.get('/me', authMiddleware, async (req, res) => {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [req.user.sub]);
      if (!result.rows[0]) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }
      return res.json({ user: result.rows[0] });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  router.get('/communities', authMiddleware, async (req, res) => {
    try {
      const result = await query(
        `SELECT c.*, u.name AS created_by_name
         FROM communities c
         LEFT JOIN users u ON u.id = c.created_by
         ORDER BY c.created_at DESC`
      );
      return res.json({ communities: result.rows });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  router.post('/communities', authMiddleware, async (req, res) => {
    const { name, description, city, neighborhood } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Nome da comunidade é obrigatório.' });
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

    try {
      const result = await query(
        `INSERT INTO communities (name, slug, description, city, neighborhood, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, slug, description || '', city || '', neighborhood || '', req.user.sub]
      );

      const community = result.rows[0];
      await query(
        `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [community.id, req.user.sub]
      );

      io.emit('community-created', community);
      return res.status(201).json({ community });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  router.get('/reports', authMiddleware, async (req, res) => {
    try {
      const result = await query(
        `SELECT r.*, u.name AS author_name, c.name AS community_name
         FROM reports r
         LEFT JOIN users u ON u.id = r.user_id
         LEFT JOIN communities c ON c.id = r.community_id
         ORDER BY r.created_at DESC`
      );
      return res.json({ reports: result.rows });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  router.post('/reports', authMiddleware, async (req, res) => {
    const { title, description, category, severity, communityId, latitude, longitude, address } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Título, descrição e categoria são obrigatórios.' });
    }

    try {
      const result = await query(
        `INSERT INTO reports (user_id, community_id, title, description, category, severity, latitude, longitude, address, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open')
         RETURNING *`,
        [req.user.sub, communityId || null, title, description, category, severity || 'medium', latitude || null, longitude || null, address || null]
      );

      const report = result.rows[0];
      io.to(`community:${communityId}`).emit('report-created', report);
      return res.status(201).json({ report });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  router.get('/reports/:id/comments', authMiddleware, async (req, res) => {
    try {
      const result = await query(
        `SELECT c.*, u.name AS author_name
         FROM comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.report_id = $1
         ORDER BY c.created_at ASC`,
        [req.params.id]
      );
      return res.json({ comments: result.rows });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  router.post('/reports/:id/comments', authMiddleware, async (req, res) => {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Mensagem é obrigatória.' });
    }

    try {
      const result = await query(
        `INSERT INTO comments (report_id, user_id, message)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.params.id, req.user.sub, message]
      );

      io.emit('comment-created', result.rows[0]);
      return res.status(201).json({ comment: result.rows[0] });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  router.get('/notifications', authMiddleware, async (req, res) => {
    try {
      const result = await query(
        `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.user.sub]
      );
      return res.json({ notifications: result.rows });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  router.post('/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
      const result = await query(
        `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
        [req.params.id, req.user.sub]
      );
      return res.json({ notification: result.rows[0] || null });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });

  return router;
};
