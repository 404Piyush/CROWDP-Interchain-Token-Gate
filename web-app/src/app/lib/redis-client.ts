import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let redisConnectionFailed = false;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_INTERVAL = 60000; // 1 minute

/**
 * Get or create Redis client instance
 */
export async function getRedisClient(): Promise<RedisClientType> {
  // If Redis connection previously failed and we're in development, 
  // don't spam connection attempts
  if (redisConnectionFailed && process.env.NODE_ENV === 'development') {
    const now = Date.now();
    if (now - lastConnectionAttempt < CONNECTION_RETRY_INTERVAL) {
      throw new Error('Redis connection previously failed, using fallback');
    }
    // Reset for retry
    redisConnectionFailed = false;
  }

  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000, // Reduced timeout for faster fallback
        reconnectStrategy: (retries) => {
          // In development, don't retry as aggressively
          if (process.env.NODE_ENV === 'development' && retries > 3) {
            return false;
          }
          if (retries > 10) {
            return false; // Stop retrying after 10 attempts
          }
          return Math.min(retries * 100, 3000); // Exponential backoff with max 3s
        }
      }
    });

    // Reduce error logging noise in development
    redisClient.on('error', (err) => {
      if (process.env.NODE_ENV === 'development') {
        // Only log once per minute in development
        const now = Date.now();
        if (now - lastConnectionAttempt > CONNECTION_RETRY_INTERVAL) {
          console.warn('Redis unavailable, using in-memory fallback');
          lastConnectionAttempt = now;
        }
      } else {
        console.error('Redis Client Error:', err);
      }
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
      redisConnectionFailed = false;
    });

    redisClient.on('ready', () => {
      console.log('Redis Client Ready');
      redisConnectionFailed = false;
    });

    redisClient.on('end', () => {
      if (process.env.NODE_ENV !== 'development') {
        console.log('Redis Client Connection Ended');
      }
    });

    try {
      lastConnectionAttempt = Date.now();
      await redisClient.connect();
    } catch (error) {
      redisConnectionFailed = true;
      
      if (process.env.NODE_ENV === 'development') {
        // Only log once in development
        console.warn('Redis not available, falling back to in-memory rate limiting');
      } else {
        console.error('Failed to connect to Redis:', error);
      }
      
      // Fall back to in-memory rate limiting if Redis is not available
      redisClient = null;
      throw error;
    }
  }

  return redisClient;
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  // If we know Redis failed recently in development, don't try again
  if (redisConnectionFailed && process.env.NODE_ENV === 'development') {
    const now = Date.now();
    if (now - lastConnectionAttempt < CONNECTION_RETRY_INTERVAL) {
      return false;
    }
  }

  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    // Only log in production or first time in development
    if (process.env.NODE_ENV !== 'development' || !redisConnectionFailed) {
      console.warn('Redis is not available, falling back to in-memory rate limiting');
    }
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

/**
 * Redis-based rate limiting implementation
 */
export async function redisRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const client = await getRedisClient();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Use Redis sorted set to track requests within the time window
    const pipeline = client.multi();
    
    // Remove expired entries
    pipeline.zRemRangeByScore(key, 0, windowStart);
    
    // Count current requests in window
    pipeline.zCard(key);
    
    // Add current request
    pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    
    // Set expiration for the key
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const currentCount = Number(results[1]) || 0;
    const allowed = currentCount < maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount - 1);
    const resetTime = now + windowMs;

    return {
      allowed,
      remaining,
      resetTime
    };
  } catch (error) {
    console.error('Redis rate limiting error:', error);
    // Fall back to allowing the request if Redis fails
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: Date.now() + windowMs
    };
  }
}