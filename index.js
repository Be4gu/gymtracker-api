import app from './src/app.js'
import { PORT } from './src/config/index.js'
import { PrismaClient } from '@prisma/client'

// Inicializar Prisma
const prisma = new PrismaClient()

// Para despliegues en Vercel (serverless)
export default app
import process from 'process'

// Solo iniciar el servidor en desarrollo local
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    try {
      // Verificar conexión a la base de datos
      await prisma.$connect()
      console.log('Conectado correctamente a la base de datos')
      console.log(`Servidor corriendo en http://localhost:${PORT}`)
    } catch (error) {
      console.error('Error al conectar con la base de datos:', error)
      process.exit(1)
    }
  })

  // Manejar el cierre de la aplicación
  process.on('SIGINT', async () => {
    await prisma.$disconnect()
    console.log('Conexión a la base de datos cerrada')
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await prisma.$disconnect()
    console.log('Conexión a la base de datos cerrada')
    process.exit(0)
  })
}
