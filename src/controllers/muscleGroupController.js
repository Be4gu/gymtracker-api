import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Obtener todos los grupos musculares del usuario
export const getMuscleGroups = async (req, res) => {
  try {
    const muscleGroups = await prisma.muscleGroup.findMany({
      where: {
        OR: [{ userId: req.user.id }, { isPublic: true }]
      },
      orderBy: [
        { userId: 'asc' }, // Primero los del usuario actual
        { name: 'asc' }
      ]
    })

    res.status(200).json(muscleGroups)
  } catch (error) {
    console.error('Error al obtener grupos musculares:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Crear un nuevo grupo muscular
export const createMuscleGroup = async (req, res) => {
  const { name, isPublic = false } = req.body

  if (!name) {
    return res.status(400).json({ error: 'El nombre del grupo muscular es requerido' })
  }

  try {
    const existingGroup = await prisma.muscleGroup.findFirst({
      where: {
        name,
        userId: req.user.id
      }
    })

    if (existingGroup) {
      return res.status(400).json({ error: 'Ya tienes un grupo muscular con ese nombre' })
    }

    const muscleGroup = await prisma.muscleGroup.create({
      data: {
        name,
        userId: req.user.id,
        isPublic
      }
    })

    res.status(201).json(muscleGroup)
  } catch (error) {
    console.error('Error al crear grupo muscular:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Actualizar un grupo muscular
export const updateMuscleGroup = async (req, res) => {
  const { id } = req.params
  const { name, isPublic } = req.body

  try {
    const muscleGroup = await prisma.muscleGroup.findUnique({
      where: { id: parseInt(id) }
    })

    if (!muscleGroup) {
      return res.status(404).json({ error: 'Grupo muscular no encontrado' })
    }

    if (muscleGroup.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este grupo muscular' })
    }

    const updatedMuscleGroup = await prisma.muscleGroup.update({
      where: { id: parseInt(id) },
      data: {
        name: name || muscleGroup.name,
        isPublic: isPublic !== undefined ? isPublic : muscleGroup.isPublic
      }
    })

    res.status(200).json(updatedMuscleGroup)
  } catch (error) {
    console.error('Error al actualizar grupo muscular:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Eliminar un grupo muscular
export const deleteMuscleGroup = async (req, res) => {
  const { id } = req.params

  try {
    const muscleGroup = await prisma.muscleGroup.findUnique({
      where: { id: parseInt(id) },
      include: { exercises: true }
    })

    if (!muscleGroup) {
      return res.status(404).json({ error: 'Grupo muscular no encontrado' })
    }

    if (muscleGroup.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este grupo muscular' })
    }

    // Verificar si el grupo tiene ejercicios asociados
    if (muscleGroup.exercises.length > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el grupo muscular porque tiene ejercicios asociados'
      })
    }

    await prisma.muscleGroup.delete({
      where: { id: parseInt(id) }
    })

    res.status(200).json({ message: 'Grupo muscular eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar grupo muscular:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
