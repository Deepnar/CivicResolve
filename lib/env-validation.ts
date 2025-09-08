/**
 * Environment variables validation
 * Validates all required environment variables at application startup
 */

interface RequiredEnvVars {
  JWT_SECRET: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
}

interface OptionalEnvVars {
  GEMINI_API_KEY?: string;
  NODE_ENV?: string;
}

type EnvVars = RequiredEnvVars & OptionalEnvVars;

export function validateEnvironment(): EnvVars {
  const requiredVars: (keyof RequiredEnvVars)[] = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
  ];

  const missingVars: string[] = [];
  const invalidVars: string[] = [];

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingVars.push(varName);
    }
  }

  // Validate specific formats
  if (process.env.DB_PORT && isNaN(parseInt(process.env.DB_PORT))) {
    invalidVars.push('DB_PORT (must be a number)');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    invalidVars.push('JWT_SECRET (must be at least 32 characters)');
  }

  // Report errors
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (invalidVars.length > 0) {
    throw new Error(`Invalid environment variables: ${invalidVars.join(', ')}`);
  }

  // Warn about optional but recommended variables
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set - AI chat feature will be disabled');
  }

  return process.env as unknown as EnvVars;
}

// Validate environment on import (fail fast)
export const env = validateEnvironment();
