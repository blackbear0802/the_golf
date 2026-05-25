// 운영 DB 기존 상품 기반 — 상품 없는 월(1·4·8·9·10·11·12)에 1개씩 추가
// 기존 상품은 삭제하지 않음. 이미 해당 월에 상품이 있으면 건너뜀(멱등).
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: "env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?w=1600&auto=format&fit=crop&q=80`;

const GOLF_PHOTOS = [
  UNSPLASH("photo-1535131749006-b7f58c99034b"),
  UNSPLASH("photo-1587174486073-ae5e5cff23aa"),
  UNSPLASH("photo-1592919505780-303950717480"),
];
const ACC_PHOTOS = [
  UNSPLASH("photo-1566073771259-6a8506099945"),
  UNSPLASH("photo-1611892440504-42a792e24d32"),
];
const DINING_PHOTOS = [
  UNSPLASH("photo-1414235077428-338989a2e8c0"),
  UNSPLASH("photo-1517248135467-4c7edcad34c4"),
];

// 운영 DB 기존 목적지 기반 신규 상품 — 없는 월 7개
const NEW_PRODUCTS = [
  {
    month: 1,
    destination: "일본 사가",
    countryCode: "JP",
    regionCode: "JP-사가",
    golfCourse: "가라쓰 컨트리 클럽",
    departureDate: new Date(Date.UTC(2026, 0, 19)),
    nights: 3,
    price: 1399000,
    included: ["왕복 항공", "호텔 3박", "골프 2R", "그린피", "조식"],
    excluded: ["중식/석식", "캐디피", "개인 경비"],
    capacity: 8,
    deadline: new Date(Date.UTC(2026, 0, 5)),
  },
  {
    month: 4,
    destination: "태국 시랏차",
    countryCode: "TH",
    regionCode: "TH-시랏차",
    golfCourse: "아마타 스프링 컨트리 클럽",
    departureDate: new Date(Date.UTC(2026, 3, 13)),
    nights: 3,
    price: 699000,
    included: ["왕복 항공", "호텔 3박", "골프 2R", "그린피"],
    excluded: ["캐디피", "식사", "개인 경비"],
    capacity: 20,
    deadline: new Date(Date.UTC(2026, 2, 30)),
  },
  {
    month: 8,
    destination: "중국 웨이하이",
    countryCode: "CN",
    regionCode: "CN-웨이하이",
    golfCourse: "석도 컨트리 클럽",
    departureDate: new Date(Date.UTC(2026, 7, 20)),
    nights: 3,
    price: 1099000,
    included: ["왕복 항공", "호텔 3박", "골프 2R", "그린피", "조식"],
    excluded: ["중식/석식", "개인 경비"],
    capacity: 32,
    deadline: new Date(Date.UTC(2026, 7, 6)),
  },
  {
    month: 9,
    destination: "일본 구마모토",
    countryCode: "JP",
    regionCode: "JP-구마모토",
    golfCourse: "조난 컨트리 클럽",
    departureDate: new Date(Date.UTC(2026, 8, 17)),
    nights: 2,
    price: 1099000,
    included: ["왕복 항공", "호텔 2박", "골프 2R", "그린피", "조식"],
    excluded: ["중식/석식", "캐디피", "개인 경비"],
    capacity: 4,
    deadline: new Date(Date.UTC(2026, 8, 3)),
  },
  {
    month: 10,
    destination: "중국 염성 쑤첸",
    countryCode: "CN",
    regionCode: "CN-염성쑤첸",
    golfCourse: "쑤첸 라마호 컨트리 클럽",
    departureDate: new Date(Date.UTC(2026, 9, 15)),
    nights: 3,
    price: 949000,
    included: ["왕복 항공", "호텔 3박", "골프 2R", "그린피"],
    excluded: ["캐디피", "식사 일부", "개인 경비"],
    capacity: 10,
    deadline: new Date(Date.UTC(2026, 9, 1)),
  },
  {
    month: 11,
    destination: "중국 합비(허페이)",
    countryCode: "CN",
    regionCode: "CN-합비(허페이)",
    golfCourse: "쌍봉호 컨트리 클럽",
    departureDate: new Date(Date.UTC(2026, 10, 12)),
    nights: 2,
    price: 899000,
    included: ["왕복 항공", "호텔 2박", "골프 2R", "그린피"],
    excluded: ["식사", "캐디피", "개인 경비"],
    capacity: 20,
    deadline: new Date(Date.UTC(2026, 9, 29)),
  },
  {
    month: 12,
    destination: "일본 사가",
    countryCode: "JP",
    regionCode: "JP-사가",
    golfCourse: "히노쿠마 컨트리 클럽",
    departureDate: new Date(Date.UTC(2026, 11, 14)),
    nights: 3,
    price: 1399000,
    included: ["왕복 항공", "호텔 3박", "골프 2R", "그린피", "조식"],
    excluded: ["중식/석식", "캐디피", "개인 경비"],
    capacity: 4,
    deadline: new Date(Date.UTC(2026, 10, 30)),
  },
];

function buildMedia(productId: string) {
  return [
    ...GOLF_PHOTOS.map((url, i) => ({
      productId, type: "golf" as const, url, order: i, caption: `골프장 ${i + 1}`,
    })),
    ...ACC_PHOTOS.map((url, i) => ({
      productId, type: "accommodation" as const, url, order: i, caption: `숙소 ${i + 1}`,
    })),
    ...DINING_PHOTOS.map((url, i) => ({
      productId, type: "dining" as const, url, order: i, caption: `식음료 ${i + 1}`,
    })),
  ];
}

async function main() {
  // 현재 DB에서 2026년 출발 상품의 월 목록 조회
  const existing = await prisma.product.findMany({
    where: {
      departureDate: {
        gte: new Date(Date.UTC(2026, 0, 1)),
        lt: new Date(Date.UTC(2027, 0, 1)),
      },
    },
    select: { departureDate: true, destination: true },
  });

  const coveredMonths = new Set(
    existing.map((p) => p.departureDate.getUTCMonth() + 1)
  );

  console.log(`현재 2026년 상품 ${existing.length}개, 커버 월: ${[...coveredMonths].sort((a, b) => a - b).join("·")}월`);

  let added = 0;
  for (const product of NEW_PRODUCTS) {
    if (coveredMonths.has(product.month)) {
      console.log(`  건너뜀 — ${product.month}월 이미 상품 있음`);
      continue;
    }

    const { month, ...data } = product;
    const created = await prisma.product.create({ data });
    await prisma.productMedia.createMany({ data: buildMedia(created.id) });
    console.log(`  ✓ ${product.month}월 추가 — ${created.destination} (${created.golfCourse})`);
    added++;
  }

  console.log(`\n완료. ${added}개 추가, ${NEW_PRODUCTS.length - added}개 건너뜀.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
