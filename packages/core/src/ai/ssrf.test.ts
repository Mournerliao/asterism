import { describe, expect, it } from 'vitest';
import {
  assertUrlIsSafe,
  classifyIp,
  type DnsResolver,
  type HostAllowlist,
  hostMatchesAllowlist,
  isPubliclyRoutableIp,
  parseHttpsUrl,
  SsrfError,
} from './ssrf';

const resolveTo =
  (...addresses: string[]): DnsResolver =>
  async () =>
    addresses;

describe('classifyIp (IPv4)', () => {
  it.each([
    ['127.0.0.1', 'loopback'],
    ['10.1.2.3', 'private'],
    ['172.16.0.1', 'private'],
    ['172.31.255.255', 'private'],
    ['172.32.0.1', 'public'],
    ['192.168.1.1', 'private'],
    ['100.64.0.1', 'cgnat'],
    ['169.254.1.1', 'link-local'],
    ['169.254.169.254', 'cloud-metadata'],
    ['169.254.170.2', 'cloud-metadata'],
    ['192.0.2.5', 'documentation'],
    ['198.18.5.5', 'reserved'],
    ['255.255.255.255', 'broadcast'],
    ['224.0.0.1', 'multicast'],
    ['0.0.0.0', 'unspecified'],
    ['8.8.8.8', 'public'],
    ['1.1.1.1', 'public'],
  ] as const)('classifies %s as %s', (ip, expected) => {
    expect(classifyIp(ip)).toBe(expected);
  });
});

describe('classifyIp (IPv6)', () => {
  it.each([
    ['::1', 'loopback'],
    ['::', 'unspecified'],
    ['fe80::1', 'link-local'],
    ['fc00::1', 'unique-local'],
    ['fd12:3456::1', 'unique-local'],
    ['ff02::1', 'multicast'],
    ['2001:db8::1', 'documentation'],
    ['100::1', 'reserved'],
    ['64:ff9b:1::1', 'reserved'],
    ['2001:2::1', 'reserved'],
    ['2001:20::1', 'reserved'],
    ['2001::1', 'reserved'],
    ['2002:0808:0808::1', 'reserved'],
    ['fec0::1', 'reserved'],
    ['2606:4700:4700::1111', 'public'],
    ['::127.0.0.1', 'loopback'],
    ['::10.0.0.1', 'private'],
    ['::ffff:127.0.0.1', 'loopback'],
    ['::ffff:10.0.0.1', 'private'],
    ['::ffff:8.8.8.8', 'public'],
  ] as const)('classifies %s as %s', (ip, expected) => {
    expect(classifyIp(ip)).toBe(expected);
  });

  it('rejects non-ip strings', () => {
    expect(classifyIp('not-an-ip')).toBe('invalid');
    expect(classifyIp('example.com')).toBe('invalid');
  });
});

describe('isPubliclyRoutableIp', () => {
  it('only accepts public addresses', () => {
    expect(isPubliclyRoutableIp('8.8.8.8')).toBe(true);
    expect(isPubliclyRoutableIp('127.0.0.1')).toBe(false);
    expect(isPubliclyRoutableIp('169.254.169.254')).toBe(false);
  });
});

describe('hostMatchesAllowlist', () => {
  it('matches everything in all mode', () => {
    expect(hostMatchesAllowlist('anything.test', { mode: 'all' })).toBe(true);
  });

  it('matches exact hosts and subdomains in list mode', () => {
    const allowlist: HostAllowlist = {
      mode: 'list',
      domains: ['api.deepseek.com', 'example.org'],
    };
    expect(hostMatchesAllowlist('api.deepseek.com', allowlist)).toBe(true);
    expect(hostMatchesAllowlist('eu.example.org', allowlist)).toBe(true);
    expect(hostMatchesAllowlist('notexample.org', allowlist)).toBe(false);
    expect(hostMatchesAllowlist('evil.com', allowlist)).toBe(false);
  });
});

describe('parseHttpsUrl', () => {
  it('requires https', () => {
    expect(parseHttpsUrl('https://api.deepseek.com/v1')?.hostname).toBe('api.deepseek.com');
    expect(parseHttpsUrl('http://api.deepseek.com')).toBeNull();
    expect(parseHttpsUrl('not a url')).toBeNull();
  });
});

describe('assertUrlIsSafe', () => {
  const listAllowlist: HostAllowlist = { mode: 'list', domains: ['api.deepseek.com'] };

  it('allows a resolvable public custom host on the allowlist', async () => {
    const url = await assertUrlIsSafe('https://api.deepseek.com/v1/chat/completions', {
      resolve: resolveTo('8.8.8.8'),
      allowlist: listAllowlist,
      requireAllowlist: true,
    });
    expect(url.hostname).toBe('api.deepseek.com');
  });

  it('rejects non-https urls', async () => {
    await expect(
      assertUrlIsSafe('http://api.deepseek.com', {
        resolve: resolveTo('8.8.8.8'),
        allowlist: { mode: 'all' },
        requireAllowlist: false,
      }),
    ).rejects.toMatchObject({ code: 'insecure_url' });
  });

  it('rejects hosts that resolve to a private address', async () => {
    await expect(
      assertUrlIsSafe('https://api.deepseek.com', {
        resolve: resolveTo('10.0.0.5'),
        allowlist: listAllowlist,
        requireAllowlist: true,
      }),
    ).rejects.toMatchObject({ code: 'forbidden_address' });
  });

  it('rejects a host off the allowlist before resolving', async () => {
    let resolved = false;
    const resolve: DnsResolver = async () => {
      resolved = true;
      return ['8.8.8.8'];
    };
    await expect(
      assertUrlIsSafe('https://evil.test', {
        resolve,
        allowlist: listAllowlist,
        requireAllowlist: true,
      }),
    ).rejects.toBeInstanceOf(SsrfError);
    expect(resolved).toBe(false);
  });

  it('rejects a literal cloud-metadata address even without an allowlist', async () => {
    await expect(
      assertUrlIsSafe('https://169.254.169.254/latest/meta-data', {
        resolve: resolveTo(),
        allowlist: { mode: 'all' },
        requireAllowlist: false,
      }),
    ).rejects.toMatchObject({ code: 'forbidden_address' });
  });

  it('rejects a literal IP when a domain allowlist is enforced', async () => {
    await expect(
      assertUrlIsSafe('https://8.8.8.8/v1', {
        resolve: resolveTo(),
        allowlist: listAllowlist,
        requireAllowlist: true,
      }),
    ).rejects.toMatchObject({ code: 'host_not_allowed' });
  });

  it('rejects when dns returns no addresses', async () => {
    await expect(
      assertUrlIsSafe('https://api.deepseek.com', {
        resolve: resolveTo(),
        allowlist: listAllowlist,
        requireAllowlist: true,
      }),
    ).rejects.toMatchObject({ code: 'dns_empty' });
  });

  it('normalizes numeric hosts before classifying', async () => {
    await expect(
      assertUrlIsSafe('https://2130706433/v1', {
        resolve: resolveTo(),
        allowlist: { mode: 'all' },
        requireAllowlist: false,
      }),
    ).rejects.toMatchObject({ code: 'forbidden_address' });
  });
});
