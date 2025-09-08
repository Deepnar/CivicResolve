interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimit {
  private store: Map<string, RateLimitEntry> = new Map();

  constructor(
    private windowMs: number = 15 * 60 * 1000, // 15 minutes
    private maxRequests: number = 100 // max requests per window
  ) {
    // Clean up expired entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  private getKey(identifier: string, endpoint?: string): string {
    return endpoint ? `${identifier}:${endpoint}` : identifier;
  }

  check(identifier: string, endpoint?: string): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(identifier, endpoint);
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      const resetTime = now + this.windowMs;
      this.store.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment counter
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }
}

// Different rate limiters for different use cases
export const rateLimiters = {
  // General API requests - 100 requests per 15 minutes
  general: new InMemoryRateLimit(15 * 60 * 1000, 100),
  
  // Authentication - stricter limit - 10 attempts per 15 minutes
  auth: new InMemoryRateLimit(15 * 60 * 1000, 10),
  
  // Issue creation - moderate limit - 20 per hour
  issueCreation: new InMemoryRateLimit(60 * 60 * 1000, 20),
  
  // Chat/AI requests - 30 per hour (expensive operations)
  ai: new InMemoryRateLimit(60 * 60 * 1000, 30)
};

export function rateLimit(
  limiter: InMemoryRateLimit,
  getIdentifier: (request: Request) => string
) {
  return (handler: (request: Request, ...args: any[]) => Promise<Response>) => {
    return async (request: Request, ...args: any[]): Promise<Response> => {
      const identifier = getIdentifier(request);
      const result = limiter.check(identifier);
      
      if (!result.allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: 'Rate limit exceeded',
              type: 'RATE_LIMIT_EXCEEDED',
              retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
            }
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limiter['maxRequests'].toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
              'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
            }
          }
        );
      }

      const response = await handler(request, ...args);
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', limiter['maxRequests'].toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
      
      return response;
    };
  };
}

// Helper functions for common identifier patterns
export const identifiers = {
  ip: (request: Request): string => {
    // Try to get real IP from various headers (for production behind proxy)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    return forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  },
  
  userAgent: (request: Request): string => {
    return request.headers.get('user-agent') || 'unknown';
  },
  
  combined: (request: Request): string => {
    const ip = identifiers.ip(request);
    const ua = identifiers.userAgent(request);
    return `${ip}:${ua.substring(0, 50)}`; // Limit UA length
  }
};

// Pre-configured rate limiting decorators
export const withRateLimit = {
  general: rateLimit(rateLimiters.general, identifiers.ip),
  auth: rateLimit(rateLimiters.auth, identifiers.combined),
  issueCreation: rateLimit(rateLimiters.issueCreation, identifiers.ip),
  ai: rateLimit(rateLimiters.ai, identifiers.combined)
};
