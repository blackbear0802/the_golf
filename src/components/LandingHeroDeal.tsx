// 메인 상단 랜딩 초특가 상품 배너 — 어드민이 지정한 1개만 노출, 클릭 시 모달.
import { prisma } from "@/lib/db";
import { APP_CONFIG_KEYS, getConfig } from "@/lib/app-config";
import { loadOperators } from "@/lib/contact-replacer";
import {
  loadDisplayBlocklist,
  buildBodyText,
  filterListItems,
  getYoutubeEmbedUrl,
  formatDate,
} from "@/lib/product-detail";
import LandingHeroDealClient from "./LandingHeroDealClient";

export default async function LandingHeroDeal() {
  const landingId = await getConfig(APP_CONFIG_KEYS.landingProductId);
  if (!landingId) return null;

  const [product, operators, displayBlocklist] = await Promise.all([
    prisma.product.findUnique({
      where: { id: landingId },
      include: {
        media: { orderBy: [{ type: "asc" }, { order: "asc" }] },
      },
    }),
    loadOperators(),
    loadDisplayBlocklist(),
  ]);
  if (!product) return null;

  // 상세페이지와 동일한 가공: 본문 정제·포함/불포함 필터·이미지/영상 분리.
  const orderedImages = product.media
    .filter((m) => m.type !== "youtube")
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((m) => ({ id: m.id, url: m.url, caption: m.caption }));
  const youtubeVideos = product.media
    .filter((m) => m.type === "youtube")
    .map((m) => ({ id: m.id, embedUrl: getYoutubeEmbedUrl(m.url), caption: m.caption }))
    .filter((v): v is { id: string; embedUrl: string; caption: string | null } => v.embedUrl !== null);

  const thumbnail = orderedImages[0]?.url ?? null;

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
        deadlineText: product.deadline ? formatDate(product.deadline) : null,
        bodyText: buildBodyText(product.rawText, displayBlocklist),
        included: filterListItems(product.included, displayBlocklist),
        excluded: filterListItems(product.excluded, displayBlocklist),
        images: orderedImages,
        youtubeVideos,
        thumbnail,
      }}
      operators={operators}
    />
  );
}
