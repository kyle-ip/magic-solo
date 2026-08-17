/**
 * Detect Challenge approximations in constructed roster oracle text.
 */
export function isChallengeSimplifiedOracle(
  oracleText: string,
  oracleTextZh = '',
): boolean {
  const combined = `${oracleText}\n${oracleTextZh}`
  return (
    /\(Challenge:|（挑战：/i.test(combined) ||
    /omitted in Challenge/i.test(combined) ||
    /在挑战中省略|挑战中省略/i.test(combined) ||
    /approximated in Challenge|近似实现/i.test(combined)
  )
}
