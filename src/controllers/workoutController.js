import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Obtener todos los entrenamientos del usuario
export const getWorkouts = async (req, res) => {
  try {
    // Consulta SQL nativa para obtener los entrenamientos del usuario
    const workouts = await prisma.$queryRaw`
      SELECT w.id, w.date, w.notes, w."userId", w."createdAt", w."updatedAt"
      FROM "Workout" w
      WHERE w."userId" = ${req.user.id}
      ORDER BY w.date DESC
    `

    // Para cada entrenamiento, obtenemos sus ejercicios
    const formattedWorkouts = await Promise.all(
      workouts.map(async (workout) => {
        // Obtener ejercicios de este entrenamiento
        const exercises = await prisma.$queryRaw`
          SELECT e.id, e.sets, e.reps, e.weight, e.notes, et.name
          FROM "Exercise" e
          LEFT JOIN "ExerciseTemplate" et ON e."exerciseTemplateId" = et.id
          WHERE e."workoutId" = ${workout.id}
        `

        // Transformar la respuesta para mantener compatibilidad con el frontend
        return {
          ...workout,
          exercises: exercises.map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            notes: exercise.notes || ''
          }))
        }
      })
    )

    res.json(formattedWorkouts)
  } catch (error) {
    console.error('Error al obtener entrenamientos:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Obtener un entrenamiento específico
export const getWorkoutById = async (req, res) => {
  const { id } = req.params

  try {
    const workoutId = parseInt(id)

    if (isNaN(workoutId)) {
      return res.status(400).json({ error: 'ID de entrenamiento inválido' })
    } // Consulta SQL nativa para obtener el entrenamiento
    const workouts = await prisma.$queryRaw`
      SELECT w.id, w.date, w.notes, w."userId"
      FROM "Workout" w
      WHERE w.id = ${workoutId}
    `

    if (!workouts || workouts.length === 0) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' })
    }

    const workout = workouts[0]

    if (workout.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para ver este entrenamiento' })
    }

    // Obtener ejercicios de este entrenamiento
    const exercises = await prisma.$queryRaw`
      SELECT e.id, e.sets, e.reps, e.weight, e.notes, et.name, e."exerciseTemplateId"
      FROM "Exercise" e
      LEFT JOIN "ExerciseTemplate" et ON e."exerciseTemplateId" = et.id
      WHERE e."workoutId" = ${workout.id}
    `

    // Transformar para mantener compatibilidad con el frontend
    const formattedWorkout = {
      ...workout,
      exercises: exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        notes: exercise.notes || '',
        exerciseTemplateId: exercise.exerciseTemplateId
      }))
    }

    res.json(formattedWorkout)
  } catch (error) {
    console.error('Error al buscar entrenamiento:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Crear un nuevo entrenamiento
export const createWorkout = async (req, res) => {
  const { date, notes, exercises } = req.body

  try {
    // Validar que haya al menos un ejercicio
    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ error: 'Debes incluir al menos un ejercicio' })
    }

    // Validar formato de ejercicios
    for (const exercise of exercises) {
      if (!exercise.name || !exercise.sets || !exercise.reps) {
        return res.status(400).json({
          error: 'Cada ejercicio debe tener nombre, series y repeticiones'
        })
      }
    }

    // Crear entrenamiento con SQL nativo, incluyendo campos createdAt y updatedAt
    const formattedDate = date ? new Date(date) : new Date()
    const workoutResult = await prisma.$queryRaw`
      INSERT INTO "Workout" (date, notes, "userId", "createdAt", "updatedAt")
      VALUES (${formattedDate}, ${notes || ''}, ${req.user.id}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, date, notes, "userId"
    `

    const workout = workoutResult[0]

    // Buscamos los ejercicios o los creamos si no existen
    const workoutExercises = []

    for (const exerciseData of exercises) {
      // Buscamos el ejercicio en la base de datos usando SQL nativo
      const exerciseTemplates = await prisma.$queryRaw`
        SELECT id FROM "ExerciseTemplate" 
        WHERE name = ${exerciseData.name}
        AND (
          "userId" = ${req.user.id} 
          OR "isPublic" = true
        )
        LIMIT 1
      `

      let exerciseTemplateId

      // Si no existe, creamos uno nuevo en el grupo "Otros"
      if (!exerciseTemplates || exerciseTemplates.length === 0) {
        // Buscamos el grupo "Otros" del usuario
        const otherGroups = await prisma.$queryRaw`
          SELECT id FROM "MuscleGroup"
          WHERE name = 'Otros'
          AND "userId" = ${req.user.id}
          LIMIT 1
        `

        let otherGroupId

        // Si no existe el grupo "Otros", lo creamos
        if (!otherGroups || otherGroups.length === 0) {
          const newGroupResult = await prisma.$queryRaw`
            INSERT INTO "MuscleGroup" (name, "userId", "isPublic", "createdAt", "updatedAt")
            VALUES ('Otros', ${req.user.id}, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
          `
          otherGroupId = newGroupResult[0].id
        } else {
          otherGroupId = otherGroups[0].id
        }

        // Creamos el ejercicio incluyendo campos createdAt y updatedAt
        const newExerciseResult = await prisma.$queryRaw`
          INSERT INTO "ExerciseTemplate" (name, "muscleGroupId", "userId", "isPublic", "createdAt", "updatedAt")
          VALUES (${exerciseData.name}, ${otherGroupId}, ${req.user.id}, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id, name
        `

        exerciseTemplateId = newExerciseResult[0].id
      } else {
        exerciseTemplateId = exerciseTemplates[0].id
      }

      // Añadimos el ejercicio al entrenamiento incluyendo campos createdAt y updatedAt
      const exerciseResult = await prisma.$queryRaw`
        INSERT INTO "Exercise" (sets, reps, weight, notes, "workoutId", "exerciseTemplateId", "createdAt", "updatedAt")
        VALUES (
          ${parseInt(exerciseData.sets) || 3}, 
          ${parseInt(exerciseData.reps) || 8}, 
          ${parseFloat(exerciseData.weight) || 0}, 
          ${exerciseData.notes || ''}, 
          ${workout.id}, 
          ${exerciseTemplateId},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING id, sets, reps, weight, notes, "workoutId"
      `

      const exercise = exerciseResult[0]

      // Obtener el nombre del ejercicio
      const exerciseName = await prisma.$queryRaw`
        SELECT name FROM "ExerciseTemplate"
        WHERE id = ${exerciseTemplateId}
      `

      workoutExercises.push({
        ...exercise,
        name: exerciseName[0].name
      })
    }

    // Devolvemos el entrenamiento con sus ejercicios
    const result = {
      ...workout,
      exercises: workoutExercises
    }

    res.status(201).json(result)
  } catch (error) {
    console.error('Error al crear entrenamiento:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Añadir ejercicios a un entrenamiento existente
export const addExercisesToWorkout = async (req, res) => {
  const { id } = req.params
  const { exercises } = req.body

  try {
    // Verificar que el entrenamiento existe y pertenece al usuario
    const workouts = await prisma.$queryRaw`
      SELECT id, "userId"
      FROM "Workout"
      WHERE id = ${parseInt(id)}
    `

    if (!workouts || workouts.length === 0) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' })
    }

    const workout = workouts[0]

    if (workout.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este entrenamiento' })
    }

    // Validar que haya al menos un ejercicio
    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ error: 'Debes incluir al menos un ejercicio' })
    }

    // Añadir los ejercicios al entrenamiento
    const workoutExercises = []

    for (const exerciseData of exercises) {
      // Buscamos el ejercicio en la base de datos
      const exerciseTemplates = await prisma.$queryRaw`
        SELECT id FROM "ExerciseTemplate" 
        WHERE name = ${exerciseData.name}
        AND (
          "userId" = ${req.user.id} 
          OR "isPublic" = true
        )
        LIMIT 1
      `

      let exerciseTemplateId

      // Si no existe, creamos uno nuevo en el grupo "Otros"
      if (!exerciseTemplates || exerciseTemplates.length === 0) {
        // Buscamos el grupo "Otros" del usuario
        const otherGroups = await prisma.$queryRaw`
          SELECT id FROM "MuscleGroup"
          WHERE name = 'Otros'
          AND "userId" = ${req.user.id}
          LIMIT 1
        `

        let otherGroupId

        // Si no existe el grupo "Otros", lo creamos
        if (!otherGroups || otherGroups.length === 0) {
          const newGroupResult = await prisma.$queryRaw`
            INSERT INTO "MuscleGroup" (name, "userId", "isPublic", "createdAt", "updatedAt")
            VALUES ('Otros', ${req.user.id}, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
          `
          otherGroupId = newGroupResult[0].id
        } else {
          otherGroupId = otherGroups[0].id
        }

        // Creamos el ejercicio incluyendo campos createdAt y updatedAt
        const newExerciseResult = await prisma.$queryRaw`
          INSERT INTO "ExerciseTemplate" (name, "muscleGroupId", "userId", "isPublic", "createdAt", "updatedAt")
          VALUES (${exerciseData.name}, ${otherGroupId}, ${req.user.id}, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id, name
        `

        exerciseTemplateId = newExerciseResult[0].id
      } else {
        exerciseTemplateId = exerciseTemplates[0].id
      }

      // Añadimos el ejercicio al entrenamiento incluyendo campos createdAt y updatedAt
      const exerciseResult = await prisma.$queryRaw`
        INSERT INTO "Exercise" (sets, reps, weight, notes, "workoutId", "exerciseTemplateId", "createdAt", "updatedAt")
        VALUES (
          ${parseInt(exerciseData.sets) || 3}, 
          ${parseInt(exerciseData.reps) || 8}, 
          ${parseFloat(exerciseData.weight) || 0}, 
          ${exerciseData.notes || ''}, 
          ${workout.id}, 
          ${exerciseTemplateId},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING id, sets, reps, weight, notes, "workoutId"
      `

      const exercise = exerciseResult[0]

      // Obtener el nombre del ejercicio
      const exerciseName = await prisma.$queryRaw`
        SELECT name FROM "ExerciseTemplate"
        WHERE id = ${exerciseTemplateId}
      `

      workoutExercises.push({
        ...exercise,
        name: exerciseName[0].name,
        exerciseTemplateId
      })
    }

    // Obtenemos el entrenamiento actualizado con SQL nativo
    const updatedWorkoutData = await prisma.$queryRaw`
      SELECT w.id, w.date, w.notes, w."userId"
      FROM "Workout" w
      WHERE w.id = ${parseInt(id)}
    `

    // Obtener todos los ejercicios de este entrenamiento
    const allExercises = await prisma.$queryRaw`
      SELECT e.id, e.sets, e.reps, e.weight, e.notes, e."exerciseTemplateId", et.name
      FROM "Exercise" e
      LEFT JOIN "ExerciseTemplate" et ON e."exerciseTemplateId" = et.id
      WHERE e."workoutId" = ${parseInt(id)}
    `

    // Transformamos para mantener compatibilidad con el frontend
    const formattedWorkout = {
      ...updatedWorkoutData[0],
      exercises: allExercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        notes: exercise.notes || '',
        exerciseTemplateId: exercise.exerciseTemplateId
      }))
    }

    res.status(200).json(formattedWorkout)
  } catch (error) {
    console.error('Error al añadir ejercicios:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
