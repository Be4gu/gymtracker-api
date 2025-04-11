import express from 'express'
import { getMuscleGroups, createMuscleGroup, updateMuscleGroup, deleteMuscleGroup } from '../controllers/muscleGroupController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// Rutas de grupos musculares
router.get('/', getMuscleGroups)
router.post('/', createMuscleGroup)
router.put('/:id', updateMuscleGroup)
router.delete('/:id', deleteMuscleGroup)

export default router
