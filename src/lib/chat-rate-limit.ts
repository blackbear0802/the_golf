// AI 챗 rate limit — IP 기반 메모리 카운터 (시간당 N턴).
// Vercel multi-instance에서는 완벽하지 않지만 MVP 폭주 가드로 충분.

const WINDOW_MS = 60 * 60 * 1000; // 1시간
const LIMIT = 30; // IP당 시간당 30턴
const MAX_ENTRIES = 5000; // 메모리 보호

type Entry = { count: number; windowStart: number };
const store = new Map<string, Entry>();

export function checkRateLimit(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();

  // 너무 커지면 가장 오래된 항목부터 제거
  if (store.size > MAX_ENTRIES) {
    const cutoff = now - WINDOW_MS;
    for (const [k, v] of store) {
      if (v.windowStart < cutoff) store.delete(k);
    }
  }

  const entry = store.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (entry.count >= LIMIT) {
    const retryAfterSec = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    return { ok: false, retryAfterSec };
  }

  entry.count += 1;
  return { ok: true };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
