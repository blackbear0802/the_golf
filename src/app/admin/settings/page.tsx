// 어드민 시스템 설정 페이지 (담당자 정보 + 밴드 OAuth 연결 + 크롤링 상태)
import { APP_CONFIG_KEYS, getConfigMany } from "@/lib/app-config";
import SettingsForm from "@/components/admin/SettingsForm";
import CrawlTriggerCard from "@/components/admin/CrawlTriggerCard";
import BandConnectionCard from "@/components/admin/BandConnectionCard";
import { fetchBands, type BandSummary } from "@/lib/band-api-client";

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

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ band?: string; reason?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const cfg = await getConfigMany([
    APP_CONFIG_KEYS.operator1Name,
    APP_CONFIG_KEYS.operator1Phone,
    APP_CONFIG_KEYS.operator1Email,
    APP_CONFIG_KEYS.operator2Name,
    APP_CONFIG_KEYS.operator2Phone,
    APP_CONFIG_KEYS.operator2Email,
    APP_CONFIG_KEYS.bandAccessToken,
    APP_CONFIG_KEYS.bandTokenExpiresAt,
    APP_CONFIG_KEYS.bandConnectedAt,
    APP_CONFIG_KEYS.bandKey,
    APP_CONFIG_KEYS.crawlEnabled,
    APP_CONFIG_KEYS.lastCrawlAt,
    APP_CONFIG_KEYS.lastCrawlSuccess,
    APP_CONFIG_KEYS.lastCrawlNew,
    APP_CONFIG_KEYS.lastCrawlError,
  ]);

  const connected = !!cfg.bandAccessToken;
  const lastCrawlAt = formatDateTime(cfg.lastCrawlAt);
  const connectedAt = formatDateTime(cfg.bandConnectedAt);
  const lastSuccess = cfg.lastCrawlSuccess === "true";

  let bands: BandSummary[] = [];
  let bandsError: string | null = null;
  if (connected && cfg.bandAccessToken) {
    try {
      bands = await fetchBands(cfg.bandAccessToken);
    } catch (err) {
      bandsError = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-black text-neutral-900">시스템 설정</h1>
      <p className="mt-1 text-base text-neutral-600">
        담당자 정보·밴드 연결·자동 크롤링 동작을 관리합니다.
      </p>

      {params.band === "connected" && (
        <p className="mt-4 rounded-xl bg-warm-50 px-4 py-3 text-base font-bold text-warm-700">
          밴드 연결이 완료되었습니다. 아래에서 대상 밴드를 선택해주세요.
        </p>
      )}
      {params.band === "error" && (
        <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-base font-medium text-brand-700">
          밴드 연결 실패: {params.reason ?? "원인 미상"}
        </p>
      )}

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
          label="밴드 연결"
          value={connected ? "연결됨" : "미연결"}
          sub={connectedAt ? `연결 시각 ${connectedAt}` : undefined}
          tone={connected ? "ok" : "muted"}
        />
        <StatusCard
          label="자동 크롤링"
          value={cfg.crawlEnabled === "true" ? "활성" : "비활성"}
          tone={cfg.crawlEnabled === "true" ? "ok" : "muted"}
        />
      </section>

      <div className="mt-8">
        <BandConnectionCard
          connected={connected}
          selectedBandKey={cfg.bandKey ?? ""}
          bands={bands}
          loadError={bandsError}
        />
      </div>

      <div className="mt-8">
        <CrawlTriggerCard />
      </div>

      <div className="mt-8">
        <SettingsForm
          initial={{
            operator1: {
              name: cfg.operator1Name ?? "",
              phone: cfg.operator1Phone ?? "",
              email: cfg.operator1Email ?? "",
            },
            operator2: {
              name: cfg.operator2Name ?? "",
              phone: cfg.operator2Phone ?? "",
              email: cfg.operator2Email ?? "",
            },
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
