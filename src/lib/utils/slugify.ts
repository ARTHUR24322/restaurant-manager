export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Supprime les accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-') // Remplace les espaces par -
    .replace(/[^\w-]+/g, '') // Supprime tout ce qui n'est pas mot ou -
    .replace(/--+/g, '-') // Supprime les doubles --
    .replace(/^-+/, '') // Supprime les - au début
    .replace(/-+$/, ''); // Supprime les - à la fin
}
