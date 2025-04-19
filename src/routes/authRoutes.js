import express from 'express'
import { getProfile, googleAuth } from '../controllers/authController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Eliminar rutas de registro e inicio de sesión por email/contraseña
router.post('/register', (req, res) => res.status(404).json({ error: 'Método no soportado' }))
router.post('/login', (req, res) => res.status(404).json({ error: 'Método no soportado' }))

// Rutas públicas
router.post('/google', googleAuth)

// Rutas protegidas
router.get('/me', authenticateToken, getProfile)

export default router
