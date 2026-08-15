/** Trigger a browser file download from a Blob or typed array. */
export function downloadBlob(data: Blob | Uint8Array, filename: string): void {
  const blob =
    data instanceof Blob
      ? data
      : new Blob([data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function printFilename(
  sourceSlug: string,
  paper: string,
  date = new Date(),
): string {
  const stamp = date.toISOString().slice(0, 10)
  const safe = sourceSlug.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '')
  return `magic-solo-print-${safe || 'cards'}-${paper}-${stamp}.pdf`
}
