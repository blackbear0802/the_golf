// 메인 상단 랜딩 초특가 상품 배너 — 어드민이 지정한 1개만 노출, 클릭 시 모달.
import { prisma } from "@/lib/db";
import { APP_CONFIG_KEYS, getConfig } from "@/lib/app-config";
import { loadOperators } from "@/lib/contact-replacer";
import LandingHeroDealClient from "./LandingHeroDealClient";

export default async function LandingHeroDeal() {
  const landingId = await getConfig(APP_CONFIG_KEYS.landingProductId);
  if (!landingId) return null;

  const [product, operators] = await Promise.all([
    prisma.product.findUnique({
      where: { id: landingId },
      include: {
        media: { orderBy: { order: "asc" }, take: 1 },
      },
    }),
    loadOperators(),
  ]);
  if (!product) return null;

  const thumbnail =
    product.media.find((m) => m.type !== "youtube")?.url ?? null;

  return (
    <LandingHeroDealClient
      product={{
        id: product.id,
        destination: product.destination,
        golfCourse: product.golfCourse,
        departureLabel: product.departureLabel,
        departureDateText: product.departureLabel ?? formatDate(product.departureDate),
        nights: product.nights,
        price: product.price,
        capacity: product.capacity,
        capacityLabel: product.capacityLabel,
        included: product.included,
        excluded: product.excluded,
        rawText: product.rawText,
        thumbnail,
      }}
      operators={operators}
    />
  );
}

function formatDate(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}
