/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

/**
 * Private IPv4 ranges, as [first octet, second octet low, second octet high].
 * 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.
 */
const PRIVATE_IPV4_RANGES: readonly (readonly [number, number, number])[] = [
	[127, 0, 255],
	[10, 0, 255],
	[172, 16, 31],
	[192, 168, 168],
];

/**
 * Whether plain http may be used for this host (ADR-001-02): `localhost`,
 * `*.local` names and private IPv4 addresses. Everything else must use https.
 * On Android this check is the only enforcement, so keep it strict.
 */
export function isLocalNetworkHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	if (host === "localhost" || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.local$/.test(host)) {
		return true;
	}

	const octets = ipv4Octets(host);
	return octets !== null && PRIVATE_IPV4_RANGES.some(([first, low, high]) => octets[0] === first && octets[1] >= low && octets[1] <= high);
}

/** The four octets of a dotted IPv4 address, or null. */
function ipv4Octets(host: string): number[] | null {
	const parts = host.split(".");
	if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part))) {
		return null;
	}

	const octets = parts.map(Number);
	return octets.every((octet) => octet <= 255) ? octets : null;
}
