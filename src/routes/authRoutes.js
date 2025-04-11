import express from 'express'
import { register, login, getProfile } from '../controllers/authController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Rutas públicas
router.post('/register', register)
router.post('/login', login)

// Rutas protegidas
router.get('/me', authenticateToken, getProfile)

export default router
