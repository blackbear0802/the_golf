// 상품 상세 OG 이미지 — 목적지/골프장/가격을 그린 1200x630 카드
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "더 골프 — 골프 투어 상품";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      destination: true,
      golfCourse: true,
      nights: true,
      price: true,
      departureDate: true,
      departureLabel: true,
    },
  });

  const destination = product?.destination ?? "골프 투어";
  const golfCourse = product?.golfCourse ?? "";
  const nights = product?.nights ?? 0;
  const priceText = product
    ? `${new Intl.NumberFormat("ko-KR").format(product.price)}원`
    : "";
  const dep = product?.departureDate;
  const dateText = product?.departureLabel
    ? `${product.departureLabel} 출발`
    : dep
    ? `${dep.getFullYear()}.${String(dep.getMonth() + 1).padStart(2, "0")}.${String(
        dep.getDate()
      ).padStart(2, "0")} 출발`
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#f8f6f1",
          color: "#163028",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: "#c9a227",
            }}
          />
          <div
            style={{ display: "flex", fontSize: 28, fontWeight: 800, letterSpacing: -1 }}
          >
            더 골프
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 28, color: "#5b6b62", fontWeight: 600 }}>
            {destination}
            {nights ? ` · ${nights}박` : ""}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 80,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            {golfCourse}
          </div>
          {dateText && (
            <div style={{ display: "flex", fontSize: 30, color: "#5b6b62" }}>
              {dateText}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", fontSize: 22, color: "#8a9a90" }}>
            항공·숙박·라운딩 포함 · 시니어 맞춤
          </div>
          {priceText && (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontSize: 56,
                fontWeight: 900,
                color: "#163028",
                letterSpacing: -1,
              }}
            >
              <div style={{ display: "flex" }}>{priceText}</div>
              <div
                style={{ display: "flex", fontSize: 24, color: "#5b6b62", marginLeft: 8 }}
              >
                / 1인
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    size
  );
}
