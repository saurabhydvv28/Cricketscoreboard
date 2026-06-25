/**
 * Generates a URL-safe human-readable player ID slug from a full name.
 * e.g. "Rohit Sharma" → "rohit-sh-4821"
 * Uses Math.random() — for production use, call this then check uniqueness
 * in the database before inserting (matches.ts createPlayer does this).
 */
export function generate_player_id(fullName: string): string {
  const base = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')

  const parts = base.split('-').filter(Boolean)
  const short =
    parts.length >= 2
      ? `${parts[0]}-${parts[1].slice(0, 2)}`
      : parts[0] ?? 'player'

  const suffix = String(Math.floor(1000 + Math.random() * 9000))
  return `${short}-${suffix}`
}
