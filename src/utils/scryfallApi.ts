/**
 * Scryfall API base URL.
 * Dev: Vite proxy avoids browser CORS failures when Scryfall/CDN returns
 * non-CORS error pages (rate limit / challenge / upstream blips).
 * Prod: direct api.scryfall.com (Scryfall allows browser CORS for OK responses).
 */
export function scryfallApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.DEV) {
    return `/scryfall-api${normalized}`
  }
  return `https://api.scryfall.com${normalized}`
}
