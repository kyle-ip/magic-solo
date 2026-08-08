/** Resolve public asset paths against Vite base (GitHub Pages). */
export function assetUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return ''
  if (/^https?:\/\//i.test(relativePath)) return relativePath
  const base = import.meta.env.BASE_URL || '/'
  const cleaned = relativePath.replace(/^\//, '')
  return `${base}${cleaned}`
}
