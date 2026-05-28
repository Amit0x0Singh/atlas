/**
 * Auth Routes — /api/auth/*
 * Login, PIN login, user management, me, change password
 */
import prisma from '../db.js'
import {
  signJwt, verifyJwt, hashPassword, verifyPassword, hashPin, verifyPin
} from '../middleware/auth.js'
import { writeAudit, auditUser } from '../middleware/audit.js'
import { authenticate, authorize } from '../middleware/auth.js'

export default async function authRoutes(fastify) {

  // ── POST /api/auth/login ──────────────────────────────────────────────────
  fastify.post('/login', async (req, reply) => {
    const { username, password } = req.body || {}
    if (!username || !password)
      return reply.status(400).send({ success: false, error: 'username and password required' })

    const rows = await prisma.$queryRaw`
      SELECT user_id, username, full_name, role, password_hash, is_active, phone
      FROM users WHERE username = ${username} LIMIT 1
    `
    const user = rows[0]
    if (!user || !user.is_active)
      return reply.status(401).send({ success: false, error: 'Invalid credentials' })

    if (!verifyPassword(password, user.password_hash))
      return reply.status(401).send({ success: false, error: 'Invalid credentials' })

    const token = signJwt({
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    })

    await writeAudit({
      userId: user.user_id, username: user.username,
      action: 'LOGIN', tableName: 'users', recordId: user.user_id,
      ip: req.ip,
    })

    return {
      success: true,
      token,
      user: { user_id: user.user_id, username: user.username, full_name: user.full_name, role: user.role },
    }
  })

  // ── POST /api/auth/pin-login — short-lived token for shop-floor device ────
  fastify.post('/pin-login', async (req, reply) => {
    const { username, pin } = req.body || {}
    if (!username || !pin)
      return reply.status(400).send({ success: false, error: 'username and pin required' })

    const rows = await prisma.$queryRaw`
      SELECT user_id, username, full_name, role, pin_hash, is_active
      FROM users WHERE username = ${username} LIMIT 1
    `
    const user = rows[0]
    if (!user || !user.is_active)
      return reply.status(401).send({ success: false, error: 'Invalid credentials' })
    if (!user.pin_hash)
      return reply.status(401).send({ success: false, error: 'PIN not set for this user' })
    if (!verifyPin(pin, user.pin_hash))
      return reply.status(401).send({ success: false, error: 'Invalid PIN' })

    // Short-lived token (30 min), marked as pin_session
    const token = signJwt({
      user_id: user.user_id, username: user.username,
      full_name: user.full_name, role: user.role, pin_session: true,
    }, 30 * 60)

    await writeAudit({
      userId: user.user_id, username: user.username,
      action: 'PIN_LOGIN', tableName: 'users', recordId: user.user_id, ip: req.ip,
    })

    return {
      success: true, token,
      user: { user_id: user.user_id, username: user.username, full_name: user.full_name, role: user.role },
    }
  })

  // ── GET /api/auth/me ──────────────────────────────────────────────────────
  fastify.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const rows = await prisma.$queryRaw`
      SELECT user_id, username, full_name, role, email, phone, is_active, created_at
      FROM users WHERE user_id = ${req.user.user_id}::uuid LIMIT 1
    `
    if (!rows[0]) return reply.status(404).send({ success: false, error: 'User not found' })
    return { success: true, data: rows[0] }
  })

  // ── GET /api/auth/users — admin list all users ────────────────────────────
  fastify.get('/users', { preHandler: authorize(['admin']) }, async (req, reply) => {
    const users = await prisma.$queryRaw`
      SELECT user_id, username, full_name, role, email, phone, is_active, created_at
      FROM users ORDER BY full_name ASC
    `
    return { success: true, data: users }
  })

  // ── POST /api/auth/users — admin create user ──────────────────────────────
  fastify.post('/users', { preHandler: authorize(['admin']) }, async (req, reply) => {
    const { username, password, full_name, role, email, phone, pin } = req.body || {}
    if (!username || !password || !full_name || !role)
      return reply.status(400).send({ success: false, error: 'username, password, full_name, role required' })

    const validRoles = [
      'gate_staff', 'store_person', 'store_manager', 'planner',
      'planning_manager', 'plant_supervisor', 'qc_person', 'sales_team', 'admin',
    ]
    if (!validRoles.includes(role))
      return reply.status(400).send({ success: false, error: `Invalid role. Must be: ${validRoles.join(', ')}` })

    const pw_hash = hashPassword(password)
    const pin_hash = pin ? hashPin(pin) : null

    try {
      const rows = await prisma.$queryRaw`
        INSERT INTO users (username, password_hash, full_name, role, email, phone, pin_hash)
        VALUES (${username}, ${pw_hash}, ${full_name}, ${role}, ${email || null}, ${phone || null}, ${pin_hash})
        RETURNING user_id, username, full_name, role, email, phone, is_active, created_at
      `
      await writeAudit({
        ...auditUser(req), action: 'CREATE', tableName: 'users',
        recordId: rows[0].user_id, newValue: { username, role },
      })
      return reply.status(201).send({ success: true, data: rows[0] })
    } catch (e) {
      if (e.message?.includes('unique')) return reply.status(409).send({ success: false, error: 'Username already exists' })
      throw e
    }
  })

  // ── PATCH /api/auth/users/:id — admin update user ─────────────────────────
  fastify.patch('/users/:id', { preHandler: authorize(['admin']) }, async (req, reply) => {
    const { full_name, role, email, phone, is_active, pin, password } = req.body || {}
    const { id } = req.params

    const sets = []
    const current = await prisma.$queryRaw`SELECT * FROM users WHERE user_id = ${id}::uuid`
    if (!current[0]) return reply.status(404).send({ success: false, error: 'User not found' })

    if (full_name !== undefined) {
      await prisma.$executeRaw`UPDATE users SET full_name = ${full_name} WHERE user_id = ${id}::uuid`
    }
    if (role !== undefined) {
      await prisma.$executeRaw`UPDATE users SET role = ${role} WHERE user_id = ${id}::uuid`
    }
    if (email !== undefined) {
      await prisma.$executeRaw`UPDATE users SET email = ${email} WHERE user_id = ${id}::uuid`
    }
    if (phone !== undefined) {
      await prisma.$executeRaw`UPDATE users SET phone = ${phone} WHERE user_id = ${id}::uuid`
    }
    if (is_active !== undefined) {
      await prisma.$executeRaw`UPDATE users SET is_active = ${is_active} WHERE user_id = ${id}::uuid`
    }
    if (password) {
      const pw_hash = hashPassword(password)
      await prisma.$executeRaw`UPDATE users SET password_hash = ${pw_hash} WHERE user_id = ${id}::uuid`
    }
    if (pin) {
      const pin_hash = hashPin(pin)
      await prisma.$executeRaw`UPDATE users SET pin_hash = ${pin_hash} WHERE user_id = ${id}::uuid`
    }

    await prisma.$executeRaw`UPDATE users SET updated_at = NOW() WHERE user_id = ${id}::uuid`

    const updated = await prisma.$queryRaw`
      SELECT user_id, username, full_name, role, email, phone, is_active FROM users WHERE user_id = ${id}::uuid
    `
    await writeAudit({
      ...auditUser(req), action: 'UPDATE', tableName: 'users',
      recordId: id, oldValue: current[0], newValue: req.body,
    })
    return { success: true, data: updated[0] }
  })

  // ── POST /api/auth/change-password — self-service ─────────────────────────
  fastify.post('/change-password', { preHandler: authenticate }, async (req, reply) => {
    const { current_password, new_password } = req.body || {}
    if (!current_password || !new_password)
      return reply.status(400).send({ success: false, error: 'current_password and new_password required' })

    const rows = await prisma.$queryRaw`
      SELECT password_hash FROM users WHERE user_id = ${req.user.user_id}::uuid
    `
    if (!rows[0]) return reply.status(404).send({ success: false, error: 'User not found' })
    if (!verifyPassword(current_password, rows[0].password_hash))
      return reply.status(401).send({ success: false, error: 'Current password is incorrect' })

    const new_hash = hashPassword(new_password)
    await prisma.$executeRaw`
      UPDATE users SET password_hash = ${new_hash}, updated_at = NOW()
      WHERE user_id = ${req.user.user_id}::uuid
    `
    await writeAudit({ ...auditUser(req), action: 'CHANGE_PASSWORD', tableName: 'users', recordId: req.user.user_id })
    return { success: true, message: 'Password changed successfully' }
  })

  // ── GET /api/auth/roles ───────────────────────────────────────────────────
  fastify.get('/roles', async () => ({
    success: true,
    data: [
      'gate_staff', 'store_person', 'store_manager', 'planner',
      'planning_manager', 'plant_supervisor', 'qc_person', 'sales_team', 'admin',
    ],
  }))
}
