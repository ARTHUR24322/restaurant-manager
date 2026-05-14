import crypto from 'crypto';

/**
 * Utilitaire de chiffrement AES-256-GCM pour protéger les tokens API.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommandé pour GCM
const AUTH_TAG_LENGTH = 16;
const KEY = (process.env.WHATSAPP_ENCRYPTION_KEY || 'default-secret-key-at-least-32-chars-long').substring(0, 32);

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedContent
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(hash: string): string {
    try {
        const [ivHex, authTagHex, encryptedHex] = hash.split(':');
        
        if (!ivHex || !authTagHex || !encryptedHex) {
            throw new Error('Format de hash invalide');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY), iv);
        
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Erreur de déchiffrement:', error);
        return '';
    }
}
