import { extname } from "path";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!;

export const BUCKET_NAME = "smartresto-images";

/**
 * Téléverse un fichier (buffer) vers Supabase Storage à l'aide de l'API REST
 * @param buffer Le contenu du fichier en Buffer
 * @param originalName Le nom originel du fichier
 * @param folder Le nom du sous-dossier, optionnel (ex: `plats`, `logos`)
 * @param mimeType Le type MIME
 * @returns {Promise<string>} L'URL publique de l'image
 */
export async function uploadImageToSupabase(
  buffer: Buffer,
  originalName: string,
  folder: string = "uploads",
  mimeType: string = "image/png"
): Promise<string> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Variables Supabase manquantes dans l'environnement");
  }

  const timestamp = Date.now();
  let ext = "";
  try {
    ext = extname(originalName);
  } catch (e) {
    console.error(e);
  }
  if (!ext) ext = ".png";
  
  const uniqueName = `${timestamp}-${Math.random().toString(36).substring(7)}${ext}`;
  const filePath = `${folder}/${uniqueName}`;

  const endpoint = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Content-Type': mimeType,
      'x-upsert': 'false' 
    },
    body: buffer as unknown as globalThis.BodyInit
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Erreur HTTP Supabase:", errText);
    throw new Error(`Erreur d'upload: ${response.statusText} - ${errText}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
}
