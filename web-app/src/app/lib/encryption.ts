import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  // If key is hex-encoded, decode it
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Otherwise, hash the key to get consistent 32-byte key
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt sensitive data (like Discord tokens)
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from('discord-token', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine iv + tag + encrypted data
    const combined = iv.toString('hex') + tag.toString('hex') + encrypted;
    return combined;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data (like Discord tokens)
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // Extract tag and encrypted data (iv is not used with createDecipher)
    const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);
    
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(Buffer.from('discord-token', 'utf8'));
    decipher.setAuthTag(tag);
    
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
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
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