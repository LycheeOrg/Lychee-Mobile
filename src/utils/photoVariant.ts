/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { Variant, VariantName, Variants } from "@/services/galleryParsers";

const AFTER_MEDIUM: VariantName[] = ["original", "small2x", "small", "thumb2x", "thumb"];

/**
 * FR-004-03: the image the viewer shows, `medium2x` on high-density screens
 * or `medium`, then the larger and smaller fallbacks; `null` when there is
 * nothing displayable (raw files).
 */
export function displayVariant(variants: Variants, pixelRatio: number): Variant | null {
	const order: VariantName[] = [...(pixelRatio > 1 ? (["medium2x"] as const) : []), "medium", ...AFTER_MEDIUM];
	return firstOf(variants, order);
}

/** FR-004-03: the image swapped in when zoomed past 1.5×, if the viewer may see it. */
export function zoomVariant(variants: Variants): Variant | null {
	return variants.original;
}

/** FR-004-05: the video file. */
export function videoSource(variants: Variants): string | null {
	return variants.original?.url ?? null;
}

/** FR-004-05: the frame shown before playback. */
export function videoPoster(variants: Variants): string | undefined {
	return firstOf(variants, ["small", "small2x", "thumb", "thumb2x"])?.url;
}

function firstOf(variants: Variants, order: VariantName[]): Variant | null {
	return order.map((name) => variants[name]).find((variant) => variant !== null) ?? null;
}
