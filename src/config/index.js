// Configuración de la aplicación
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

export const PORT = process.env.PORT || 3000
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'
export const DATABASE_URL = process.env.DATABASE_URL

// Configuración de CORS
export const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? ['https://gym-tracker-client.vercel.app', 'https://gym-tracker-client-git-main.vercel.app', /\.vercel\.app$/] // Dominios de producción
      : '*', // En desarrollo, permitir todas las conexiones
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
