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
 * Encrypt sensitive data (like Discord tokens) using AES-256-GCM with integrity protection
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = Buffer.from(key.slice(0, 64), 'hex'); // Take first 64 hex chars = 32 bytes
    const iv = crypto.randomBytes(12); // 12 bytes for AES-256-GCM (recommended)
    
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag for integrity protection
    const authTag = cipher.getAuthTag();
    
    // Combine iv + authTag + encrypted data
    const combined = iv.toString('hex') + authTag.toString('hex') + encrypted;
    return combined;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data (like Discord tokens) using AES-256-GCM with integrity verification
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = Buffer.from(key.slice(0, 64), 'hex'); // Take first 64 hex chars = 32 bytes
    
    // Extract IV (12 bytes = 24 hex chars), auth tag (16 bytes = 32 hex chars), and encrypted data
    const ivHex = encryptedData.slice(0, 24); // First 24 hex chars = 12 bytes IV
    const authTagHex = encryptedData.slice(24, 56); // Next 32 hex chars = 16 bytes auth tag
    const encrypted = encryptedData.slice(56); // Remaining data
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag); // Set auth tag for integrity verification
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8'); // This will throw if integrity check fails
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - data may be corrupted or tampered with');
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