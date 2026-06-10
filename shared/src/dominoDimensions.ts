/** Standard domino dimensions (real-world: 48×24×7.5 mm, 8.5 g). */

const FT_PER_M = 3.280839895;

/** Thickness along the topple line (7.5 mm). */
export const DOMINO_THICKNESS_M = 0.0075;

/** Face width perpendicular to the topple line (24 mm). */
export const DOMINO_WIDTH_M = 0.024;

/** Standing height / length (48 mm). */
export const DOMINO_HEIGHT_M = 0.048;

export const DOMINO_WEIGHT_KG = 0.0085;

/** Gap between dominos along the topple direction (8.5 mm). */
export const DOMINO_COL_GAP_M = 0.0085;

/** Gap between rows (4 mm). */
export const DOMINO_ROW_GAP_M = 0.004;

/** Center-to-center pitch along the topple line (thickness + gap). */
export const DOMINO_COL_SPACING_M = DOMINO_THICKNESS_M + DOMINO_COL_GAP_M;
export const DOMINO_ROW_SPACING_M = DOMINO_WIDTH_M + DOMINO_ROW_GAP_M;

/** Feet equivalents used by floor-plan sizing. */
export const DOMINO_THICKNESS_FT = DOMINO_THICKNESS_M * FT_PER_M;
export const DOMINO_WIDTH_FT = DOMINO_WIDTH_M * FT_PER_M;
export const DOMINO_HEIGHT_FT = DOMINO_HEIGHT_M * FT_PER_M;
export const DOMINO_COL_GAP_FT = DOMINO_COL_GAP_M * FT_PER_M;
export const DOMINO_ROW_GAP_FT = DOMINO_ROW_GAP_M * FT_PER_M;
export const DOMINO_WALL_COL_GAP_FT = 0.104987;

/**
 * Critical tilt angle θc at which the head of a falling train first strikes the next
 * upright domino. From van Leeuwen (2004): θc = arcsin(s / h), where s is the face
 * gap (not center-to-center pitch).
 */
export function dominoTriggerAngleRad(): number {
  return Math.asin(DOMINO_COL_GAP_M / DOMINO_HEIGHT_M);
}

/**
 * Stacking angle θ∞ where fallen dominos rest against each other in the train.
 * cos(θ∞) = d / (s + d) — they do not lie flat.
 */
export function dominoStackingAngleRad(): number {
  return Math.acos(DOMINO_THICKNESS_M / DOMINO_COL_SPACING_M);
}

/** Balance angle: tilt beyond which gravity topples the domino instead of restoring it. */
export function dominoBalanceAngleRad(): number {
  return Math.atan(DOMINO_THICKNESS_M / DOMINO_HEIGHT_M);
}

/**
 * Train recursion (van Leeuwen 2004, eq. 3): given the tilt angle of a domino in the
 * leaning train, returns the tilt angle of the domino directly behind it:
 * θ_behind = θ_front + arcsin(((s+d)·cos θ_front − d) / h).
 * Iterating this from the head of the train converges to the stacking angle.
 */
export function dominoTrainAngleBehind(frontAngle: number): number {
  const arg =
    (DOMINO_COL_SPACING_M * Math.cos(frontAngle) - DOMINO_THICKNESS_M) / DOMINO_HEIGHT_M;
  return frontAngle + Math.asin(Math.max(-1, Math.min(1, arg)));
}

/** Minimum s/h ratio for a self-sustaining chain (van Leeuwen eq. 79, thin limit). */
export function dominoMinGapRatio(): number {
  const aspect = DOMINO_THICKNESS_M / DOMINO_HEIGHT_M;
  return (2 * aspect) / Math.sqrt(3 * (1 - aspect * aspect));
}

/** Whether the configured col gap can sustain a chain reaction. */
export function dominoChainViable(): boolean {
  return DOMINO_COL_GAP_M / DOMINO_HEIGHT_M > dominoMinGapRatio();
}
