import * as crypto from 'crypto';

/**
 * Get or generate encryption key from environment
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return key;
}

/**
 * Encrypt sensitive data (like Discord tokens) using AES-256-CBC
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = Buffer.from(key.slice(0, 64), 'hex'); // Take first 64 hex chars = 32 bytes
    const iv = crypto.randomBytes(16); // 16 bytes for AES-256-CBC
    
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine iv + encrypted data
    const combined = iv.toString('hex') + encrypted;
    return combined;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data (like Discord tokens) using AES-256-CBC
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = Buffer.from(key.slice(0, 64), 'hex'); // Take first 64 hex chars = 32 bytes
    
    // Extract IV and encrypted data
    const ivHex = encryptedData.slice(0, 32); // First 32 hex chars = 16 bytes IV
    const encrypted = encryptedData.slice(32);
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a new encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex'); // 32 bytes = 256 bits
}

/**
 * Encrypt Discord tokens for storage
 */
export function encryptDiscordTokens(accessToken: string, refreshToken: string): {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
} {
  return {
    encryptedAccessToken: encrypt(accessToken),
    encryptedRefreshToken: encrypt(refreshToken)
  };
}

/**
 * Decrypt Discord tokens for use
 */
export function decryptDiscordTokens(encryptedAccessToken: string, encryptedRefreshToken: string): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: decrypt(encryptedAccessToken),
    refreshToken: decrypt(encryptedRefreshToken)
  };
}