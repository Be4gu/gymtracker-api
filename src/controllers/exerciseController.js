import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Obtener ejercicios (con filtro opcional por grupo muscular)
export const getExercises = async (req, res) => {
  const { muscleGroupId } = req.query

  try {
    let whereClause = {
      OR: [{ userId: req.user.id }, { isPublic: true }]
    }

    if (muscleGroupId) {
      whereClause = {
        ...whereClause,
        muscleGroupId: parseInt(muscleGroupId)
      }
    }

    const exercises = await prisma.exerciseTemplate.findMany({
      where: whereClause,
      include: { muscleGroup: true },
      orderBy: [
        { userId: 'asc' }, // Primero los del usuario actual
        { name: 'asc' }
      ]
    })

    res.status(200).json(exercises)
  } catch (error) {
    console.error('Error al obtener ejercicios:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Crear nuevo ejercicio
export const createExercise = async (req, res) => {
  const { name, muscleGroupId, isPublic = false } = req.body

  if (!name || !muscleGroupId) {
    return res.status(400).json({ error: 'Nombre y grupo muscular son requeridos' })
  }

  try {
    // Verificar si el grupo muscular existe
    const muscleGroup = await prisma.muscleGroup.findUnique({
      where: { id: parseInt(muscleGroupId) }
    })

    if (!muscleGroup) {
      return res.status(404).json({ error: 'Grupo muscular no encontrado' })
    }

    // Verificar si ya existe un ejercicio con el mismo nombre para este usuario
    const existingExercise = await prisma.exerciseTemplate.findFirst({
      where: {
        name,
        userId: req.user.id
      }
    })

    if (existingExercise) {
      return res.status(400).json({ error: 'Ya tienes un ejercicio con ese nombre' })
    }

    const exercise = await prisma.exerciseTemplate.create({
      data: {
        name,
        muscleGroupId: parseInt(muscleGroupId),
        userId: req.user.id,
        isPublic
      },
      include: { muscleGroup: true }
    })

    res.status(201).json(exercise)
  } catch (error) {
    console.error('Error al crear ejercicio:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Actualizar ejercicio
export const updateExercise = async (req, res) => {
  const { id } = req.params
  const { name, muscleGroupId, isPublic } = req.body

  try {
    const exercise = await prisma.exerciseTemplate.findUnique({
      where: { id: parseInt(id) }
    })

    if (!exercise) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' })
    }

    if (exercise.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este ejercicio' })
    }

    // Si se proporciona un muscleGroupId, verificar que existe
    if (muscleGroupId) {
      const muscleGroup = await prisma.muscleGroup.findUnique({
        where: { id: parseInt(muscleGroupId) }
      })

      if (!muscleGroup) {
        return res.status(404).json({ error: 'Grupo muscular no encontrado' })
      }
    }

    const updatedExercise = await prisma.exerciseTemplate.update({
      where: { id: parseInt(id) },
      data: {
        name: name || exercise.name,
        muscleGroupId: muscleGroupId ? parseInt(muscleGroupId) : exercise.muscleGroupId,
        isPublic: isPublic !== undefined ? isPublic : exercise.isPublic
      },
      include: { muscleGroup: true }
    })

    res.status(200).json(updatedExercise)
  } catch (error) {
    console.error('Error al actualizar ejercicio:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Eliminar ejercicio
export const deleteExercise = async (req, res) => {
  const { id } = req.params

  try {
    const exercise = await prisma.exerciseTemplate.findUnique({
      where: { id: parseInt(id) },
      include: { exercises: true }
    })

    if (!exercise) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' })
    }

    if (exercise.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este ejercicio' })
    }

    // Verificar si el ejercicio está siendo usado en algún entrenamiento
    if (exercise.exercises.length > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el ejercicio porque está siendo usado en entrenamientos'
      })
    }

    await prisma.exerciseTemplate.delete({
      where: { id: parseInt(id) }
    })

    res.status(200).json({ message: 'Ejercicio eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar ejercicio:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
