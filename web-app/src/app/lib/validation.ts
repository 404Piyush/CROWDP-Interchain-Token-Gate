import { z } from 'zod';

// Common validation schemas
export const walletAddressSchema = z.string()
  .min(1, 'Wallet address is required')
  .regex(/^[a-zA-Z0-9]+$/, 'Invalid wallet address format')
  .max(100, 'Wallet address too long');

export const discordIdSchema = z.string()
  .min(1, 'Discord ID is required')
  .regex(/^\d{17,19}$/, 'Invalid Discord ID format');

export const discordUsernameSchema = z.string()
  .min(1, 'Discord username is required')
  .max(32, 'Discord username too long')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid Discord username format');

export const sessionTokenSchema = z.string()
  .min(1, 'Session token is required')
  .regex(/^[a-f0-9]{64}$/, 'Invalid session token format');

export const oauthStateSchema = z.string()
  .min(1, 'OAuth state is required')
  .regex(/^[a-f0-9]{64}$/, 'Invalid OAuth state format');

export const oauthCodeSchema = z.string()
  .min(1, 'OAuth code is required')
  .max(1000, 'OAuth code too long');

export const apiKeySchema = z.string()
  .min(1, 'API key is required')
  .max(200, 'API key too long');

// Request body validation schemas
export const saveUserRequestSchema = z.object({
  walletAddress: walletAddressSchema,
  discordId: discordIdSchema,
  discordUsername: discordUsernameSchema,
  balance: z.number().min(0, 'Balance must be non-negative'),
});

export const assignRolesRequestSchema = z.object({
  discordId: discordIdSchema,
  roles: z.array(z.string().min(1).max(50)).max(10, 'Too many roles'),
});

export const unlinkRequestSchema = z.object({
  walletAddress: walletAddressSchema.optional(),
  discordId: discordIdSchema.optional(),
}).refine(
  (data) => data.walletAddress || data.discordId,
  { message: 'Either walletAddress or discordId must be provided' }
);

export const checkUserRequestSchema = z.object({
  walletAddress: walletAddressSchema,
});

export const sessionRequestSchema = z.object({
  walletAddress: walletAddressSchema,
});

export const testRoleRequestSchema = z.object({
  walletAddress: walletAddressSchema,
  roleId: z.string().min(1, 'Role ID is required').max(50, 'Role ID too long'),
});

// Query parameter validation schemas
export const walletQuerySchema = z.object({
  address: walletAddressSchema,
});

export const discordQuerySchema = z.object({
  discordId: discordIdSchema,
});

// Header validation schemas
export const authHeadersSchema = z.object({
  'x-api-key': apiKeySchema.optional(),
  'x-session-token': sessionTokenSchema.optional(),
  'authorization': z.string().optional(),
}).refine(
  (data) => data['x-api-key'] || data['x-session-token'] || data['authorization'],
  { message: 'Authentication header required' }
);

// Sanitization functions
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
    .slice(0, 1000); // Limit length
}

export function sanitizeWalletAddress(address: string): string {
  return address
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Only allow alphanumeric
    .slice(0, 100);
}

export function sanitizeDiscordId(discordId: string): string {
  return discordId
    .trim()
    .replace(/[^0-9]/g, '') // Only allow numbers
    .slice(0, 19);
}

// Validation helper functions
export function validateAndSanitizeInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(input);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}

export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): T {
  const result = validateAndSanitizeInput(schema, body);
  if (!result.success) {
    throw new Error(`Invalid request body: ${result.error}`);
  }
  return result.data;
}

export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown
): T {
  const result = validateAndSanitizeInput(schema, params);
  if (!result.success) {
    throw new Error(`Invalid query parameters: ${result.error}`);
  }
  return result.data;
}

export function validateHeaders<T>(
  schema: z.ZodSchema<T>,
  headers: unknown
): T {
  const result = validateAndSanitizeInput(schema, headers);
  if (!result.success) {
    throw new Error(`Invalid headers: ${result.error}`);
  }
  return result.data;
}