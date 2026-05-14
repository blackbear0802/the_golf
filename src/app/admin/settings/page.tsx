// 어드민 시스템 설정 페이지 (담당자 정보 + 밴드 인증 + 크롤링 상태)
import { APP_CONFIG_KEYS, getConfigMany } from "@/lib/app-config";
import SettingsForm from "@/components/admin/SettingsForm";

function mask(value: string | null): string {
  if (!value) return "";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}.${m}.${day} ${hh}:${mm}`;
}

export default async function AdminSettingsPage() {
  const cfg = await getConfigMany([
    APP_CONFIG_KEYS.operatorName,
    APP_CONFIG_KEYS.operatorPhone,
    APP_CONFIG_KEYS.operatorEmail,
    APP_CONFIG_KEYS.bandId,
    APP_CONFIG_KEYS.bandNidAut,
    APP_CONFIG_KEYS.bandNidSes,
    APP_CONFIG_KEYS.crawlEnabled,
    APP_CONFIG_KEYS.cookieExpiredAt,
    APP_CONFIG_KEYS.lastCrawlAt,
    APP_CONFIG_KEYS.lastCrawlSuccess,
    APP_CONFIG_KEYS.lastCrawlNew,
    APP_CONFIG_KEYS.lastCrawlError,
  ]);

  const cookieExpired = !!cfg.cookieExpiredAt;
  const lastCrawlAt = formatDateTime(cfg.lastCrawlAt);
  const lastSuccess = cfg.lastCrawlSuccess === "true";

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-black text-neutral-900">시스템 설정</h1>
      <p className="mt-1 text-base text-neutral-600">
        담당자 정보·밴드 인증·자동 크롤링 동작을 관리합니다
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatusCard
          label="마지막 크롤링"
          value={lastCrawlAt ?? "아직 없음"}
          sub={
            lastCrawlAt
              ? lastSuccess
                ? `성공 · 새 글 ${cfg.lastCrawlNew ?? 0}건`
                : `실패 · ${cfg.lastCrawlError ?? "원인 미상"}`
              : undefined
          }
          tone={lastCrawlAt ? (lastSuccess ? "ok" : "warn") : "muted"}
        />
        <StatusCard
          label="네이버 쿠키"
          value={
            cookieExpired
              ? "만료됨"
              : cfg.bandNidAut && cfg.bandNidSes
              ? "등록됨"
              : "미등록"
          }
          sub={cookieExpired ? "쿠키를 다시 등록해주세요" : undefined}
          tone={
            cookieExpired ? "warn" : cfg.bandNidAut && cfg.bandNidSes ? "ok" : "muted"
          }
        />
        <StatusCard
          label="자동 크롤링"
          value={cfg.crawlEnabled === "true" ? "활성" : "비활성"}
          tone={cfg.crawlEnabled === "true" ? "ok" : "muted"}
        />
      </section>

      <div className="mt-8">
        <SettingsForm
          initial={{
            operatorName: cfg.operatorName ?? "",
            operatorPhone: cfg.operatorPhone ?? "",
            operatorEmail: cfg.operatorEmail ?? "",
            bandId: cfg.bandId ?? "",
            bandNidAutMasked: mask(cfg.bandNidAut),
            bandNidSesMasked: mask(cfg.bandNidSes),
            crawlEnabled: cfg.crawlEnabled === "true",
          }}
        />
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "ok" | "warn" | "muted";
}) {
  const toneClass =
    tone === "ok"
      ? "border-warm-300 bg-white"
      : tone === "warn"
      ? "border-brand-300 bg-brand-50"
      : "border-neutral-200 bg-white";
  const valueColor =
    tone === "ok"
      ? "text-warm-600"
      : tone === "warn"
      ? "text-brand-600"
      : "text-neutral-900";

  return (
    <div className={`rounded-2xl border-2 p-5 ${toneClass}`}>
      <p className="text-sm font-bold text-neutral-500">{label}</p>
      <p className={`mt-2 text-2xl md:text-3xl font-black ${valueColor}`}>{value}</p>
      {sub && <p className="mt-2 text-sm text-neutral-600">{sub}</p>}
    </div>
  );
}
