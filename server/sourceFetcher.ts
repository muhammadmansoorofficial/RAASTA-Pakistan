import dns from 'node:dns/promises';
import net from 'node:net';
import type { MonitoredSource } from '../src/types.ts';

export interface RawDiscoveredItem {
  title: string;
  url: string;
  content: string;
  publishedDate: string; // YYYY-MM-DD or ''
  explicitDeadline?: string;
}

export interface SourceFetchOutcome {
  status: 'ok' | 'error' | 'skipped';
  error: string | null;
  items: RawDiscoveredItem[];
}

function isPrivateOrReservedIp(ip: string): boolean {
  const cleaned = ip.replace(/^::ffff:/i, '');
  if (net.isIPv4(cleaned)) {
    const parts = cleaned.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reserved
    return false;
  }

  if (net.isIPv6(cleaned)) {
    const lower = cleaned.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
    return false;
  }

  return true;
}

export function validateUrlFormat(rawUrl: string): { valid: boolean; parsed?: URL; reason?: string } {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, reason: 'URL is required.' };
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: 'Invalid URL syntax.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, reason: 'Only http:// and https:// URLs are permitted.' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Embedded URL credentials are not allowed.' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return { valid: false, reason: 'Local or internal hostnames are blocked for security.' };
  }

  if (net.isIP(host) && isPrivateOrReservedIp(host)) {
    return { valid: false, reason: 'Private, loopback, or metadata IP addresses are blocked.' };
  }

  return { valid: true, parsed };
}

export async function validateSafePublicUrl(
  rawUrl: string,
): Promise<{ safe: boolean; url?: URL; reason?: string }> {
  const formatCheck = validateUrlFormat(rawUrl);
  if (!formatCheck.valid || !formatCheck.parsed) {
    return { safe: false, reason: formatCheck.reason };
  }

  const host = formatCheck.parsed.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) {
      return { safe: false, reason: 'Blocked private IP address.' };
    }
    return { safe: true, url: formatCheck.parsed };
  }

  try {
    const records = await dns.lookup(host, { all: true });
    if (!records.length) {
      return { safe: false, reason: 'Domain did not resolve to any public IP address.' };
    }
    for (const rec of records) {
      if (isPrivateOrReservedIp(rec.address)) {
        return { safe: false, reason: `Domain resolves to restricted address (${rec.address}).` };
      }
    }
    return { safe: true, url: formatCheck.parsed };
  } catch {
    // DNS may fail in restricted offline sandboxes; format is still validated
    return { safe: false, reason: `DNS lookup unavailable or failed for ${host}.` };
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeIsoDate(raw?: string): string {
  if (!raw) return '';
  const cleaned = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 10);
  }
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

function resolveItemUrl(candidate: string, baseUrl: string): string {
  try {
    const resolved = new URL(candidate.trim(), baseUrl);
    if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
      return resolved.toString();
    }
  } catch {
    // fall back
  }
  return baseUrl;
}

function detectsAccessRestriction(status: number, body: string): string | null {
  if (status === 401 || status === 403) {
    return `HTTP ${status}: Portal restricted automated access or requires login (not bypassed).`;
  }
  if (status === 429) {
    return 'HTTP 429: Rate limited by official portal (respecting cooldown).';
  }
  const lower = body.slice(0, 4000).toLowerCase();
  if (
    lower.includes('g-recaptcha') ||
    lower.includes('hcaptcha') ||
    lower.includes('cf-turnstile') ||
    lower.includes('verify you are human') ||
    lower.includes('just a moment...') ||
    lower.includes('attention required! | cloudflare')
  ) {
    return 'CAPTCHA / anti-bot challenge detected; skipped without bypassing.';
  }
  if (lower.includes('type="password"') && lower.includes('login') && body.length < 12000) {
    return 'Authentication wall detected; skipped without bypassing.';
  }
  return null;
}

export function extractItemsFromBody(
  body: string,
  sourceType: MonitoredSource['sourceType'],
  baseUrl: string,
): RawDiscoveredItem[] {
  const items: RawDiscoveredItem[] = [];

  if (sourceType === 'api') {
    try {
      const parsed = JSON.parse(body) as unknown;
      const list = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)
          ? (parsed as { items: unknown[] }).items
          : parsed && typeof parsed === 'object' && Array.isArray((parsed as { data?: unknown }).data)
            ? (parsed as { data: unknown[] }).data
            : [];

      for (const entry of list.slice(0, 15)) {
        if (!entry || typeof entry !== 'object') continue;
        const rec = entry as Record<string, unknown>;
        const title = String(rec.title ?? rec.name ?? '').trim();
        const url = resolveItemUrl(String(rec.url ?? rec.link ?? baseUrl), baseUrl);
        const content = stripTags(String(rec.description ?? rec.summary ?? rec.content ?? title));
        const publishedDate = normalizeIsoDate(
          String(rec.publishedAt ?? rec.publishedDate ?? rec.date ?? ''),
        );
        if (title) {
          items.push({
            title: title.slice(0, 220),
            url,
            content: content.slice(0, 2000),
            publishedDate,
            explicitDeadline: typeof rec.deadline === 'string' ? rec.deadline.trim() : undefined,
          });
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  if (sourceType === 'rss' || body.includes('<rss') || body.includes('<feed')) {
    const itemRegex = /<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(body)) !== null && items.length < 15) {
      const block = match[1];
      const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(block);
      const linkMatch =
        /<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i.exec(block) ||
        /<link[^>]*>([\s\S]*?)<\/link>/i.exec(block);
      const descMatch =
        /<(?:description|summary|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content)>/i.exec(
          block,
        );
      const dateMatch =
        /<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i.exec(
          block,
        );

      const title = stripTags(titleMatch?.[1] ?? '').slice(0, 220);
      const url = resolveItemUrl(stripTags(linkMatch?.[1] ?? baseUrl), baseUrl);
      const content = stripTags(descMatch?.[1] ?? title).slice(0, 2000);
      const publishedDate = normalizeIsoDate(stripTags(dateMatch?.[1] ?? ''));
      if (title) {
        items.push({ title, url, content, publishedDate });
      }
    }
    return items;
  }

  if (sourceType === 'sitemap' || body.includes('<urlset')) {
    const urlBlockRegex = /<url\b[^>]*>([\s\S]*?)<\/url>/gi;
    let match: RegExpExecArray | null;
    while ((match = urlBlockRegex.exec(body)) !== null && items.length < 12) {
      const block = match[1];
      const locMatch = /<loc[^>]*>([\s\S]*?)<\/loc>/i.exec(block);
      const modMatch = /<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i.exec(block);
      const loc = stripTags(locMatch?.[1] ?? '');
      if (!loc) continue;
      const slug = loc.split('/').filter(Boolean).pop() ?? loc;
      const derivedTitle = slug
        .replace(/[-_]+/g, ' ')
        .replace(/\.[a-z0-9]+$/i, '')
        .trim();
      if (derivedTitle.length < 6) continue;
      items.push({
        title: derivedTitle.slice(0, 200),
        url: resolveItemUrl(loc, baseUrl),
        content: `Official portal update indexed from sitemap path: ${loc}`,
        publishedDate: normalizeIsoDate(stripTags(modMatch?.[1] ?? '')),
      });
    }
    return items;
  }

  // Permitted HTML extraction: inspect announcement-like links (excluding nav/login/bare-domain links)
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const keywordRegex =
    /\b(job|jobs|vacancy|vacancies|career|careers|recruitment|scholarship|scholarships|admission|admissions|course|courses|training|notice|announcement|announcements|advertisement|merit|grant|bisp|nadra|hec|fpsc|spsc|ppsc|kppsc|bpsc|navttc|apply|open|2026|2027)\b/i;
  const navSkipPathRegex = /\/(login|signin|register|contact|about|policies|sitemap|privacy|terms|faq)\/?$/i;
  const genericTextRegex = /^(www\.|https?:\/\/|more about |read more|view all|click here|home\b)/i;
  const seenUrls = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(body)) !== null && items.length < 10) {
    const href = match[1];
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      continue;
    }
    const text = stripTags(match[2])
      .replace(/[•·|]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    if (text.length < 22 || genericTextRegex.test(text)) continue;
    const resolved = resolveItemUrl(href, baseUrl);
    if (navSkipPathRegex.test(new URL(resolved).pathname)) continue;
    if (!keywordRegex.test(`${text} ${href}`)) continue;
    if (seenUrls.has(resolved)) continue;
    seenUrls.add(resolved);
    items.push({
      title: text,
      url: resolved,
      content: text,
      publishedDate: '',
    });
  }

  return items;
}

export async function fetchSourceAnnouncements(source: MonitoredSource): Promise<SourceFetchOutcome> {
  const safety = await validateSafePublicUrl(source.url);
  if (!safety.safe || !safety.url) {
    return {
      status: 'error',
      error: safety.reason || 'URL failed security validation.',
      items: [],
    };
  }

  // Respect robots.txt disallow for root if reachable quickly
  try {
    const robotsUrl = new URL('/robots.txt', safety.url.origin).toString();
    const robotsRes = await fetch(robotsUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'RAASTA-Pakistan-CivicMonitor/1.0' },
      signal: AbortSignal.timeout(3000),
    });
    if (robotsRes.ok) {
      const robotsTxt = await robotsRes.text();
      if (/user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/im.test(robotsTxt)) {
        return {
          status: 'skipped',
          error: 'Portal robots.txt disallows automated indexing (honoring policy).',
          items: [],
        };
      }
    }
  } catch {
    // robots.txt unavailable or timed out; continue to direct fetch check
  }

  try {
    const res = await fetch(safety.url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'RAASTA-Pakistan-CivicMonitor/1.0 (+https://pakistan.gov.pk)',
        Accept: 'application/rss+xml, application/xml, application/json, text/html;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(6500),
    });

    // Re-validate final redirected URL against SSRF
    if (res.url && res.url !== safety.url.toString()) {
      const redirectCheck = validateUrlFormat(res.url);
      if (!redirectCheck.valid) {
        return {
          status: 'error',
          error: `Blocked unsafe redirect target: ${redirectCheck.reason}`,
          items: [],
        };
      }
    }

    const body = await res.text();
    const restricted = detectsAccessRestriction(res.status, body);
    if (restricted) {
      return {
        status: 'skipped',
        error: restricted,
        items: [],
      };
    }

    if (!res.ok) {
      return {
        status: 'error',
        error: `HTTP ${res.status} (${res.statusText || 'Request failed'})`,
        items: [],
      };
    }

    const items = extractItemsFromBody(body, source.sourceType, safety.url.toString());
    return {
      status: 'ok',
      error: null,
      items,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network fetch error';
    return {
      status: 'error',
      error: msg.includes('abort') || msg.includes('timeout') ? 'Connection timed out (6.5s).' : msg,
      items: [],
    };
  }
}
