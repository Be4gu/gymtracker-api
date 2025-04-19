import express from 'express'
import { getRanking } from '../controllers/statsController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// Ruta para obtener ranking
router.get('/ranking', getRanking)

export default router
