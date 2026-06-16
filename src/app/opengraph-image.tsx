// 홈 OG 이미지 — 1200x630 브랜드 카드 (소셜 미리보기용 자동 생성)
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "더 골프 — 맞춤 골프 투어";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          backgroundColor: "#163028",
          color: "#f8f6f1",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: "#c9a227",
            }}
          />
          <div
            style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: -1 }}
          >
            더 골프
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            <div style={{ display: "flex" }}>맞춤</div>
            <div style={{ display: "flex" }}>골프 투어 패키지</div>
          </div>
          <div
            style={{ display: "flex", fontSize: 32, color: "#d6d2c4", lineHeight: 1.3 }}
          >
            AI가 골라드리는 항공·숙박·라운딩 일괄 견적
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 24,
            color: "#a8a293",
          }}
        >
          <div style={{ display: "flex" }}>전문 상담원 24시간 내 연락</div>
          <div style={{ display: "flex", color: "#c9a227", fontWeight: 700 }}>thegolfer.co.kr</div>
        </div>
      </div>
    ),
    size
  );
}
