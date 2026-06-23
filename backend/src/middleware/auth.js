import { supabase, createUserClient } from '../lib/supabase.js'
import logger from '../lib/logger.js'

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Auth failure: missing token', { ip: req.ip, path: req.path })
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    logger.warn('Auth failure: invalid token', { ip: req.ip, path: req.path })
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = user
  req.db = createUserClient(token)
  next()
}
