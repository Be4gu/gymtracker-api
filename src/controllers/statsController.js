import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Obtener ranking por ejercicio
export const getRanking = async (req, res) => {
  const { exercise } = req.query

  if (!exercise) {
    return res.status(400).json({ error: 'Debe proporcionar un nombre de ejercicio' })
  }

  try {
    // Conseguir todos los ejercicios con ese nombre y sus pesos máximos por usuario
    // Usamos SQL nativo para máxima flexibilidad
    const rankings = await prisma.$queryRaw`
      WITH MaxWeights AS (
        SELECT 
          u.id AS "userId",
          u.name AS "userName",
          u.email AS "userEmail",
          et.name AS "exerciseName",
          MAX(e.weight) AS "maxWeight",
          (
            SELECT w.date 
            FROM "Exercise" e2
            JOIN "Workout" w ON e2."workoutId" = w.id
            JOIN "ExerciseTemplate" et2 ON e2."exerciseTemplateId" = et2.id
            WHERE et2.name = ${exercise}
            AND e2.weight = MAX(e.weight)
            AND w."userId" = u.id
            LIMIT 1
          ) AS "date"
        FROM "User" u
        JOIN "Workout" w ON w."userId" = u.id
        JOIN "Exercise" e ON e."workoutId" = w.id
        JOIN "ExerciseTemplate" et ON e."exerciseTemplateId" = et.id
        WHERE et.name = ${exercise}
        GROUP BY u.id, u.name, u.email, et.name
      )
      SELECT 
        "userId",
        "userName",
        "userEmail",
        "maxWeight" as weight,
        "date"
      FROM MaxWeights
      ORDER BY weight DESC
    `

    // Formatear la respuesta para el frontend
    const formattedRankings = rankings.map((item) => ({
      userId: item.userId,
      name: item.userName || item.userEmail.split('@')[0],
      weight: parseFloat(item.weight) || 0,
      date: item.date
    }))

    res.status(200).json(formattedRankings)
  } catch (error) {
    console.error('Error al obtener ranking:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
