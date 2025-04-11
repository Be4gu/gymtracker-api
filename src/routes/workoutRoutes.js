import express from 'express'
import { getWorkouts, getWorkoutById, createWorkout, addExercisesToWorkout } from '../controllers/workoutController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// Rutas de entrenamientos
router.get('/', getWorkouts)
router.get('/:id', getWorkoutById)
router.post('/', createWorkout)
router.post('/:id/exercises', addExercisesToWorkout)

export default router
