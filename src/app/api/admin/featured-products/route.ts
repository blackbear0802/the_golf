// 메인 노출 상품(특가 최대 3개 + 랜딩 초특가 1개) 설정 API
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { APP_CONFIG_KEYS, getConfigMany, setConfigMany } from "@/lib/app-config";

const MAX_FEATURED = 3;

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const cfg = await getConfigMany([
    APP_CONFIG_KEYS.featuredProductIds,
    APP_CONFIG_KEYS.landingProductId,
  ]);
  return NextResponse.json({
    featuredProductIds: parseIds(cfg.featuredProductIds),
    landingProductId: cfg.landingProductId ?? "",
  });
}

type Payload = {
  featuredProductIds?: string[];
  landingProductId?: string | null;
};

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = (await req.json()) as Payload;
  const updates: Partial<Record<string, string>> = {};

  if (Array.isArray(body.featuredProductIds)) {
    const ids = Array.from(
      new Set(body.featuredProductIds.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean))
    );
    if (ids.length > MAX_FEATURED) {
      return NextResponse.json(
        { error: `특가 상품은 최대 ${MAX_FEATURED}개까지 선택할 수 있습니다.` },
        { status: 400 }
      );
    }
    if (ids.length > 0) {
      const found = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });
      const foundSet = new Set(found.map((p) => p.id));
      const missing = ids.filter((id) => !foundSet.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: "존재하지 않는 상품이 포함되어 있습니다." },
          { status: 400 }
        );
      }
    }
    updates[APP_CONFIG_KEYS.featuredProductIds] = ids.join(",");
  }

  if (body.landingProductId !== undefined) {
    const raw =
      typeof body.landingProductId === "string" ? body.landingProductId.trim() : "";
    if (raw) {
      const p = await prisma.product.findUnique({ where: { id: raw }, select: { id: true } });
      if (!p) {
        return NextResponse.json(
          { error: "존재하지 않는 상품입니다." },
          { status: 400 }
        );
      }
    }
    updates[APP_CONFIG_KEYS.landingProductId] = raw;
  }

  await setConfigMany(updates);
  return NextResponse.json({ ok: true });
}
