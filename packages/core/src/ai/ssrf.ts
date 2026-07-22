/**
 * SSRF guard for custom generation endpoints (ADR 0024). Pure and runtime-agnostic:
 * the IP classifier and allowlist matcher are synchronous, and the URL guard takes an
 * injected DNS resolver so it runs identically in tests and inside the Edge Function.
 * Keep this file self-contained (no cross-file imports) so Deno can import it by path.
 */

export type IpClassification =
  | 'public'
  | 'loopback'
  | 'private'
  | 'cgnat'
  | 'link-local'
  | 'unique-local'
  | 'reserved'
  | 'documentation'
  | 'broadcast'
  | 'multicast'
  | 'cloud-metadata'
  | 'unspecified'
  | 'invalid';

export type DnsResolver = (hostname: string) => Promise<string[]>;

export type HostAllowlist = { mode: 'all' } | { mode: 'list'; domains: string[] };

export interface UrlGuardOptions {
  resolve: DnsResolver;
  allowlist: HostAllowlist;
  requireAllowlist: boolean;
}

export class SsrfError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SsrfError';
    this.code = code;
  }
}

type Hextets = [number, number, number, number, number, number, number, number];

function parseIpv4Octets(ip: string): [number, number, number, number] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!match) return null;
  const octets = [match[1], match[2], match[3], match[4]].map((part) => Number(part));
  if (octets.some((value) => value > 255)) return null;
  const [a, b, c, d] = octets;
  return [a, b, c, d] as [number, number, number, number];
}

function classifyIpv4([a, b, c, d]: [number, number, number, number]): IpClassification {
  if (a === 0) return b === 0 && c === 0 && d === 0 ? 'unspecified' : 'reserved';
  if (a === 127) return 'loopback';
  if (a === 10) return 'private';
  if (a === 172 && b >= 16 && b <= 31) return 'private';
  if (a === 192 && b === 168) return 'private';
  if (a === 100 && b >= 64 && b <= 127) return 'cgnat';
  if (a === 169 && b === 254) {
    if (c === 169 && d === 254) return 'cloud-metadata';
    if (c === 170 && d === 2) return 'cloud-metadata';
    return 'link-local';
  }
  if (a === 192 && b === 0 && c === 0) return 'reserved';
  if (a === 192 && b === 0 && c === 2) return 'documentation';
  if (a === 198 && b === 51 && c === 100) return 'documentation';
  if (a === 203 && b === 0 && c === 113) return 'documentation';
  if (a === 198 && (b === 18 || b === 19)) return 'reserved';
  if (a >= 224 && a <= 239) return 'multicast';
  if (a >= 240) return a === 255 && b === 255 && c === 255 && d === 255 ? 'broadcast' : 'reserved';
  return 'public';
}

function parseIpv6(ip: string): Hextets | null {
  const zoneIndex = ip.indexOf('%');
  const address = zoneIndex === -1 ? ip : ip.slice(0, zoneIndex);
  if (!address.includes(':')) return null;

  let head = address;
  let embeddedV4: [number, number, number, number] | null = null;
  const lastColon = address.lastIndexOf(':');
  const trailing = address.slice(lastColon + 1);
  if (trailing.includes('.')) {
    embeddedV4 = parseIpv4Octets(trailing);
    if (!embeddedV4) return null;
    head = address.slice(0, lastColon + 1);
  }

  const doubleColon = head.indexOf('::');
  let groups: string[];
  if (doubleColon !== -1) {
    const before = head
      .slice(0, doubleColon)
      .split(':')
      .filter((part) => part.length > 0);
    const after = head
      .slice(doubleColon + 2)
      .split(':')
      .filter((part) => part.length > 0);
    const embeddedGroups = embeddedV4 ? 2 : 0;
    const missing = 8 - (before.length + after.length + embeddedGroups);
    if (missing < 0) return null;
    groups = [...before, ...Array<string>(missing).fill('0'), ...after];
  } else {
    groups = head.split(':').filter((part) => part.length > 0);
  }

  const hextets: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    hextets.push(Number.parseInt(group, 16));
  }
  if (embeddedV4) {
    const [a, b, c, d] = embeddedV4;
    hextets.push((a << 8) | b, (c << 8) | d);
  }
  return hextets.length === 8 ? (hextets as Hextets) : null;
}

function classifyIpv6(hextets: Hextets): IpClassification {
  const [h0, h1, h2, h3, h4, h5, h6, h7] = hextets;
  if ([h0, h1, h2, h3, h4, h5, h6, h7].every((part) => part === 0)) return 'unspecified';
  if (
    h0 === 0 &&
    h1 === 0 &&
    h2 === 0 &&
    h3 === 0 &&
    h4 === 0 &&
    h5 === 0 &&
    h6 === 0 &&
    h7 === 1
  ) {
    return 'loopback';
  }
  if (h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0xffff) {
    return classifyIpv4([(h6 >> 8) & 0xff, h6 & 0xff, (h7 >> 8) & 0xff, h7 & 0xff]);
  }
  // Deprecated IPv4-compatible addresses can still encode a forbidden IPv4 target.
  if (h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0) {
    return classifyIpv4([(h6 >> 8) & 0xff, h6 & 0xff, (h7 >> 8) & 0xff, h7 & 0xff]);
  }
  if ((h0 & 0xff00) === 0xff00) return 'multicast';
  if ((h0 & 0xffc0) === 0xfe80) return 'link-local';
  if ((h0 & 0xfe00) === 0xfc00) return 'unique-local';
  if ((h0 & 0xffc0) === 0xfec0) return 'reserved';
  if (h0 === 0x0100 && h1 === 0 && h2 === 0 && h3 === 0) return 'reserved';
  if (h0 === 0x0064 && (h1 & 0xff00) === 0xff00) return 'reserved';
  if (h0 === 0x2001 && h1 === 0x0002) return 'reserved';
  if (h0 === 0x2001 && (h1 & 0xfff0) === 0x0020) return 'reserved';
  if (h0 === 0x2001 && h1 === 0) return 'reserved';
  if (h0 === 0x2001 && h1 === 0x0db8) return 'documentation';
  if (h0 === 0x2002) return 'reserved';
  return 'public';
}

/** Classify an IPv4 or IPv6 literal. Returns `invalid` for anything that is not an IP literal. */
export function classifyIp(ip: string): IpClassification {
  const trimmed = ip.trim();
  const v4 = parseIpv4Octets(trimmed);
  if (v4) return classifyIpv4(v4);
  const v6 = parseIpv6(trimmed);
  if (v6) return classifyIpv6(v6);
  return 'invalid';
}

/** Only globally routable unicast addresses are safe upstream targets. */
export function isPubliclyRoutableIp(ip: string): boolean {
  return classifyIp(ip) === 'public';
}

/** Match a host against the deployer allowlist (exact host or subdomain suffix). */
export function hostMatchesAllowlist(host: string, allowlist: HostAllowlist): boolean {
  if (allowlist.mode === 'all') return true;
  const normalized = host.trim().toLowerCase().replace(/\.$/, '');
  if (normalized.length === 0) return false;
  return allowlist.domains.some((raw) => {
    const domain = raw.trim().toLowerCase().replace(/^\.+/, '').replace(/\.$/, '');
    if (domain.length === 0) return false;
    return normalized === domain || normalized.endsWith(`.${domain}`);
  });
}

/** Parse a URL and require the HTTPS scheme. */
export function parseHttpsUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  return url.protocol === 'https:' ? url : null;
}

function hostToIpLiteral(hostname: string): string | null {
  if (hostname.startsWith('[') && hostname.endsWith(']')) return hostname.slice(1, -1);
  return parseIpv4Octets(hostname) ? hostname : null;
}

/**
 * Assert a single URL is safe to fetch: HTTPS only, host not a forbidden IP, and — for
 * custom endpoints — the host is allowlisted and every resolved address is public. The
 * caller re-runs this per redirect hop with `fetch(redirect: 'manual')`.
 */
export async function assertUrlIsSafe(rawUrl: string, options: UrlGuardOptions): Promise<URL> {
  const url = parseHttpsUrl(rawUrl);
  if (!url) throw new SsrfError('insecure_url', 'Only HTTPS URLs are permitted');

  const host = url.hostname;
  const literal = hostToIpLiteral(host);
  if (literal !== null) {
    if (!isPubliclyRoutableIp(literal)) {
      throw new SsrfError('forbidden_address', `Address ${literal} is not publicly routable`);
    }
    if (options.requireAllowlist && options.allowlist.mode === 'list') {
      throw new SsrfError(
        'host_not_allowed',
        'Literal IP endpoints cannot match a domain allowlist',
      );
    }
    return url;
  }

  if (options.requireAllowlist && !hostMatchesAllowlist(host, options.allowlist)) {
    throw new SsrfError('host_not_allowed', `Host ${host} is not on the allowlist`);
  }

  const addresses = await options.resolve(host);
  if (addresses.length === 0) {
    throw new SsrfError('dns_empty', `No addresses resolved for ${host}`);
  }
  for (const address of addresses) {
    if (!isPubliclyRoutableIp(address)) {
      throw new SsrfError('forbidden_address', `Resolved ${address} is not publicly routable`);
    }
  }
  return url;
}
