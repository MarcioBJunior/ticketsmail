import { NextRequest } from 'next/server'

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  interval: number // in milliseconds
  uniqueTokenPerInterval: number // max requests per interval
}

export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<{ success: boolean; remaining: number }> => {
    // Get IP or use a fallback
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'anonymous'
    
    const now = Date.now()
    const key = `${ip}:${request.nextUrl.pathname}`
    
    // Clean up old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }
    
    const record = rateLimitStore.get(key)
    
    if (!record || record.resetTime < now) {
      // Create new record
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.interval
      })
      return { success: true, remaining: config.uniqueTokenPerInterval - 1 }
    }
    
    if (record.count >= config.uniqueTokenPerInterval) {
      return { success: false, remaining: 0 }
    }
    
    // Increment counter
    record.count++
    return { success: true, remaining: config.uniqueTokenPerInterval - record.count }
  }
}

// Preset configurations
export const rateLimiters = {
  // API endpoints: 30 requests per minute
  api: rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 30
  }),
  
  // Auth endpoints: 5 requests per minute
  auth: rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 5
  }),
  
  // File upload: 10 requests per hour
  upload: rateLimit({
    interval: 60 * 60 * 1000,
    uniqueTokenPerInterval: 10
  })
}