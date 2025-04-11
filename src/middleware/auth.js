import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/index.js'

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.status(401).json({ error: 'Acceso denegado' })

  try {
    const verified = jwt.verify(token, JWT_SECRET)
    req.user = verified
    next()
  } catch (error) {
    res.status(403).json({ error: 'Token inválido' })
  }
}
