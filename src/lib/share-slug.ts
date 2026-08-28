const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates a short, URL-safe, hard-to-guess slug for public share links.
 * Takes an injectable random function so it's deterministically testable
 * (real callers just use the default Math.random).
 */
export function generateShareSlug(length = 10, random: () => number = Math.random): string {
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return slug;
}
