/* eslint-disable @typescript-eslint/no-unused-vars */
import crypto from 'crypto';

/**
 * Utilitaire de chiffrement AES-256-GCM pour protéger les tokens API.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommandé pour GCM
const AUTH_TAG_LENGTH = 16;
// SÉCURITÉ E5 : Ne jamais utiliser une clé par défaut en production
const RAW_KEY = process.env.WHATSAPP_ENCRYPTION_KEY;
if (!RAW_KEY && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: WHATSAPP_ENCRYPTION_KEY environment variable is missing in production! Please add it to your Vercel project.');
}
const KEY = (RAW_KEY || 'dev-only-whatsapp-key-do-not-use-in-prod!!').substring(0, 32);

export function encryptAES(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedContent
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// Alias pour compatibilité arrière
export const encrypt = encryptAES;

export function decryptAES(hash: string): string {
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

// Alias pour compatibilité arrière
export const decrypt = decryptAES;
