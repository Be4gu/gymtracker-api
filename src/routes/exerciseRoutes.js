import express from 'express'
import { getExercises, createExercise, updateExercise, deleteExercise } from '../controllers/exerciseController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// Rutas de ejercicios
router.get('/', getExercises)
router.post('/', createExercise)
router.put('/:id', updateExercise)
router.delete('/:id', deleteExercise)

export default router
