// 시스템 설정 KV 헬퍼 (AppConfig 모델 read/write — 운영자 연락처, 밴드 쿠키, 크롤링 상태 등)
import { prisma } from "@/lib/db";

export const APP_CONFIG_KEYS = {
  operatorName: "operatorName",
  operatorPhone: "operatorPhone",
  operatorEmail: "operatorEmail",
  bandId: "bandId",
  bandCookies: "bandCookies",
  crawlEnabled: "crawlEnabled",
  cookieExpiredAt: "cookieExpiredAt",
  lastCrawlAt: "lastCrawlAt",
  lastCrawlSuccess: "lastCrawlSuccess",
  lastCrawlNew: "lastCrawlNew",
  lastCrawlError: "lastCrawlError",
} as const;

export type AppConfigKey = (typeof APP_CONFIG_KEYS)[keyof typeof APP_CONFIG_KEYS];

export async function getConfig(key: AppConfigKey): Promise<string | null> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function getConfigBoolean(key: AppConfigKey): Promise<boolean> {
  const v = await getConfig(key);
  return v === "true";
}

export async function getConfigNumber(key: AppConfigKey): Promise<number | null> {
  const v = await getConfig(key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function getConfigMany<T extends AppConfigKey>(
  keys: readonly T[]
): Promise<Record<T, string | null>> {
  const rows = await prisma.appConfig.findMany({ where: { key: { in: [...keys] } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(keys.map((k) => [k, map.get(k) ?? null])) as Record<
    T,
    string | null
  >;
}

export async function setConfig(key: AppConfigKey, value: string): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function setConfigMany(entries: Partial<Record<AppConfigKey, string>>): Promise<void> {
  const ops = Object.entries(entries)
    .filter(([, v]) => typeof v === "string")
    .map(([key, value]) =>
      prisma.appConfig.upsert({
        where: { key },
        create: { key, value: value as string },
        update: { value: value as string },
      })
    );
  if (ops.length > 0) await prisma.$transaction(ops);
}

export async function deleteConfig(key: AppConfigKey): Promise<void> {
  await prisma.appConfig.deleteMany({ where: { key } });
}
