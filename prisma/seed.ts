// Phase 1 MVP 시드 데이터 (동남아/일본 시니어 골프 패키지 5개 + 미디어)
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?w=1600&auto=format&fit=crop&q=80`;

const SAMPLE_MEDIA = {
  golf: [
    UNSPLASH("photo-1535131749006-b7f58c99034b"),
    UNSPLASH("photo-1587174486073-ae5e5cff23aa"),
    UNSPLASH("photo-1592919505780-303950717480"),
  ],
  accommodation: [
    UNSPLASH("photo-1566073771259-6a8506099945"),
    UNSPLASH("photo-1611892440504-42a792e24d32"),
  ],
  dining: [
    UNSPLASH("photo-1414235077428-338989a2e8c0"),
    UNSPLASH("photo-1517248135467-4c7edcad34c4"),
  ],
  youtube: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
};

const products = [
  {
    destination: "태국 치앙마이",
    golfCourse: "알파인 골프 리조트 & 스파",
    departureDate: new Date("2026-06-15"),
    nights: 4,
    price: 1290000,
    included: ["왕복 항공", "4성급 호텔 4박", "골프 3R", "그린피", "캐디피", "공항 픽업"],
    excluded: ["식사 일부", "개인 경비", "여행자 보험"],
    capacity: 16,
    deadline: new Date("2026-05-31"),
  },
  {
    destination: "베트남 다낭",
    golfCourse: "바나힐스 골프 클럽",
    departureDate: new Date("2026-06-22"),
    nights: 5,
    price: 1590000,
    included: ["왕복 항공", "5성급 리조트 5박", "골프 4R", "그린피", "캐디피", "전 일정 식사"],
    excluded: ["개인 경비", "여행자 보험", "팁"],
    capacity: 20,
    deadline: new Date("2026-06-07"),
  },
  {
    destination: "일본 후쿠오카",
    golfCourse: "코코파 더 골프 클럽",
    departureDate: new Date("2026-07-03"),
    nights: 3,
    price: 1390000,
    included: ["왕복 항공", "4성급 호텔 3박", "골프 2R", "그린피", "조식"],
    excluded: ["중식/석식", "캐디피", "교통비"],
    capacity: 12,
    deadline: new Date("2026-06-19"),
  },
  {
    destination: "필리핀 세부",
    golfCourse: "알타 비스타 골프 & 컨트리 클럽",
    departureDate: new Date("2026-07-12"),
    nights: 5,
    price: 1490000,
    included: ["왕복 항공", "5성급 리조트 5박", "골프 4R", "그린피", "캐디피", "조식"],
    excluded: ["중식/석식", "개인 경비", "팁"],
    capacity: 16,
    deadline: new Date("2026-06-28"),
  },
  {
    destination: "말레이시아 코타키나발루",
    golfCourse: "수트라 하버 골프 & 컨트리 클럽",
    departureDate: new Date("2026-07-20"),
    nights: 4,
    price: 1390000,
    included: ["왕복 항공", "5성급 리조트 4박", "골프 3R", "그린피", "캐디피", "조식"],
    excluded: ["중식/석식", "개인 경비", "여행자 보험"],
    capacity: 16,
    deadline: new Date("2026-07-05"),
  },
];

function buildMedia(productId: string) {
  const rows = [
    ...SAMPLE_MEDIA.golf.map((url, i) => ({
      productId,
      type: "golf" as const,
      url,
      order: i,
      caption: `골프장 ${i + 1}`,
    })),
    ...SAMPLE_MEDIA.accommodation.map((url, i) => ({
      productId,
      type: "accommodation" as const,
      url,
      order: i,
      caption: `숙소 ${i + 1}`,
    })),
    ...SAMPLE_MEDIA.dining.map((url, i) => ({
      productId,
      type: "dining" as const,
      url,
      order: i,
      caption: `식음료 ${i + 1}`,
    })),
    ...SAMPLE_MEDIA.youtube.map((url, i) => ({
      productId,
      type: "youtube" as const,
      url,
      order: i,
      caption: "소개 영상",
    })),
  ];
  return rows;
}

async function main() {
  console.log("기존 상품·미디어 데이터 삭제 중...");
  await prisma.productMedia.deleteMany();
  await prisma.product.deleteMany();

  console.log(`${products.length}개 상품 시드 시작...`);
  for (const product of products) {
    const created = await prisma.product.create({ data: product });
    await prisma.productMedia.createMany({ data: buildMedia(created.id) });
    console.log(`  ✓ ${created.destination} — ${created.golfCourse}`);
  }

  console.log("시드 완료.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
