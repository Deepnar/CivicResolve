import { z } from 'zod';

export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks (basic version)
   */
  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') return '';
    
    // Basic HTML sanitization - remove script tags and dangerous attributes
    let cleaned = input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '');
    
    // Only allow safe HTML tags
    const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'];
    const tagPattern = /<(\/?)([\w]+)([^>]*)>/gi;
    
    cleaned = cleaned.replace(tagPattern, (match, closing, tagName, attributes) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        // For anchor tags, only allow href attribute
        if (tagName.toLowerCase() === 'a' && !closing) {
          const href = attributes.match(/href\s*=\s*["']([^"']+)["']/i);
          if (href && (href[1].startsWith('http') || href[1].startsWith('/'))) {
            return `<a href="${href[1]}">`;
          }
          return '<a>';
        }
        return `<${closing}${tagName}>`;
      }
      return '';
    });
    
    return cleaned;
  }

  /**
   * Sanitize plain text by removing HTML tags and limiting length
   */
  static sanitizeText(input: string, maxLength = 1000): string {
    if (typeof input !== 'string') return '';
    
    // Remove HTML tags
    let cleaned = input.replace(/<[^>]*>/g, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    // Limit length
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength);
    }
    
    return cleaned;
  }

  /**
   * Sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }

  /**
   * Sanitize phone numbers (remove non-numeric characters)
   */
  static sanitizePhone(phone: string): string {
    if (typeof phone !== 'string') return '';
    return phone.replace(/[^\d+()-\s]/g, '').trim();
  }

  /**
   * Sanitize SQL input (basic protection - use parameterized queries instead)
   */
  static sanitizeForSQL(input: string): string {
    if (typeof input !== 'string') return '';
    return input.replace(/['";\\]/g, '');
  }

  /**
   * Validate and sanitize coordinates
   */
  static sanitizeCoordinates(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    
    if (isNaN(latNum) || isNaN(lngNum)) return null;
    if (latNum < -90 || latNum > 90) return null;
    if (lngNum < -180 || lngNum > 180) return null;
    
    return { lat: latNum, lng: lngNum };
  }

  /**
   * Comprehensive request body sanitization
   */
  static sanitizeObject<T extends Record<string, any>>(
    obj: T,
    options: {
      textFields?: (keyof T)[];
      htmlFields?: (keyof T)[];
      emailFields?: (keyof T)[];
      phoneFields?: (keyof T)[];
      maxLength?: number;
    } = {}
  ): T {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = { ...obj };
    const { textFields = [], htmlFields = [], emailFields = [], phoneFields = [], maxLength = 1000 } = options;

    // Sanitize text fields
    textFields.forEach(field => {
      if (typeof sanitized[field] === 'string') {
        sanitized[field] = this.sanitizeText(sanitized[field] as string, maxLength) as T[keyof T];
      }
    });

    // Sanitize HTML fields
    htmlFields.forEach(field => {
      if (typeof sanitized[field] === 'string') {
        sanitized[field] = this.sanitizeHTML(sanitized[field] as string) as T[keyof T];
      }
    });

    // Sanitize email fields
    emailFields.forEach(field => {
      if (typeof sanitized[field] === 'string') {
        sanitized[field] = this.sanitizeEmail(sanitized[field] as string) as T[keyof T];
      }
    });

    // Sanitize phone fields
    phoneFields.forEach(field => {
      if (typeof sanitized[field] === 'string') {
        sanitized[field] = this.sanitizePhone(sanitized[field] as string) as T[keyof T];
      }
    });

    return sanitized;
  }
}

// Zod schemas for common validation patterns
export const CommonSchemas = {
  email: z.string().email().max(255),
  password: z.string().min(8).max(128).refine(
    (password) => {
      // At least one uppercase, one lowercase, one number or symbol
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumberOrSymbol = /[\d\W]/.test(password);
      return hasUpper && hasLower && hasNumberOrSymbol;
    },
    {
      message: "Password must contain uppercase, lowercase, and number/symbol"
    }
  ),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  address: z.string().min(1).max(500),
  phone: z.string().optional().refine(
    (phone) => !phone || /^[\d+()-\s]+$/.test(phone),
    { message: "Invalid phone number format" }
  )
};
