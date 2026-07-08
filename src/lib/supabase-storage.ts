import { extname } from "path";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!;

export const BUCKET_NAME = "smartresto-images";

/**
 * Téléverse un fichier vers Supabase Storage à l'aide de l'API REST.
 *
 * Fix critique : Next.js Server Actions (webpack-internal) ne peuvent pas
 * sérialiser un `Buffer` directement comme BodyInit.
 * On l'enveloppe dans un `Blob` avec le bon Content-Type, ce qui garantit
 * une transmission binaire correcte quelle que soit l'implémentation fetch.
 *
 * @param buffer  Le contenu du fichier en Buffer (venant de arrayBuffer())
 * @param originalName Le nom originel du fichier (pour l'extension)
 * @param folder  Le sous-dossier dans le bucket (ex: 'plats', 'logos')
 * @param mimeType Le type MIME du fichier
 * @returns L'URL publique de l'image uploadée
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
  } catch {
    // ignore
  }
  if (!ext) ext = ".png";

  const uniqueName = `${timestamp}-${Math.random().toString(36).substring(7)}${ext}`;
  const filePath = `${folder}/${uniqueName}`;
  const endpoint = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`;

  // Convertir le Buffer en Uint8Array puis en Blob pour une compatibilité
  // maximale avec le fetch bundlé de Next.js (webpack-internal).
  // Un Buffer castée directement en BodyInit peut être mal encodé dans ce runtime.
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const blob = new Blob([uint8 as BlobPart], { type: mimeType });

  // Timeout de 45 secondes (les grandes images peuvent prendre du temps)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        // Ne pas définir Content-Type manuellement quand on passe un Blob :
        // fetch le déduit automatiquement avec le bon boundary/type.
        // On le force quand même pour Supabase qui en a besoin explicitement.
        "Content-Type": mimeType,
        "x-upsert": "true", // Remplace si le fichier existe déjà (évite les 400)
      },
      body: blob,
      signal: controller.signal,
    });
  } catch (fetchErr: unknown) {
    const err = fetchErr as Error;
    if (err.name === "AbortError") {
      throw new Error(
        "Upload Supabase annulé : délai dépassé (45s). Le fichier est peut-être trop lourd ou la connexion est instable."
      );
    }
    throw new Error(`Erreur réseau Supabase Storage : ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Supabase Storage] Erreur HTTP:", response.status, errText);
    throw new Error(`Erreur d'upload (${response.status}): ${errText}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
}
