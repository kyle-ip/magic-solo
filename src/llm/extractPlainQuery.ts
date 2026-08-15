/** First line of model output, stripped of common wrappers. */
export function extractPlainQuery(text: string): string {
  const line = text.trim().split(/\r?\n/)[0]?.trim() ?? ''
  return line
    .replace(/^```[\w]*\s*/i, '')
    .replace(/```$/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
}
