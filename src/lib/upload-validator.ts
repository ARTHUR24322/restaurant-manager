/**
 * Utilitaire de validation des fichiers uploadés.
 * SÉCURITÉ M4 : Empêche l'upload de fichiers malveillants et la consommation disque illimitée.
 */

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

/**
 * Valide un fichier uploadé (type MIME, extension, taille).
 * Retourne un nom de fichier sanitizé si valide.
 */
export function validateUploadFile(
  file: File,
  options?: {
    maxSize?: number;
    allowedMimes?: string[];
    allowedExtensions?: string[];
  }
): UploadValidationResult {
  const maxSize = options?.maxSize || MAX_FILE_SIZE;
  const allowedMimes = options?.allowedMimes || ALLOWED_MIMES;
  const allowedExtensions = options?.allowedExtensions || ALLOWED_EXTENSIONS;

  // 1. Vérifier la taille
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    return {
      valid: false,
      error: `Le fichier dépasse la taille maximale autorisée (${maxMB} MB).`,
    };
  }

  // 2. Vérifier le type MIME
  if (!allowedMimes.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé (${file.type}). Types acceptés : ${allowedMimes.join(', ')}.`,
    };
  }

  // 3. Vérifier l'extension
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Extension de fichier non autorisée (.${extension}). Extensions acceptées : ${allowedExtensions.join(', ')}.`,
    };
  }

  // 4. Sanitizer le nom de fichier (supprimer les caractères spéciaux)
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.'); // Empêcher les doubles points (directory traversal)

  return {
    valid: true,
    sanitizedName,
  };
}
