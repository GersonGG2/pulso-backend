/**
 * Convert a tournament name to a URL-safe slug.
 * Strips diacritics, lowercases, replaces non-alphanumerics with dashes,
 * trims dashes, and caps length.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Random URL-safe suffix used to disambiguate slugs that collide.
 */
export function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
