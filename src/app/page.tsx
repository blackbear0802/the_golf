// 홈 페이지 (Header + Hero + 랜딩 초특가 + 신뢰 섹션 + Footer + 우측 고정 플로팅 추천)
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustSection from "@/components/TrustSection";
import Footer from "@/components/Footer";
import FloatingDeals from "@/components/FloatingDeals";
import LandingHeroDeal from "@/components/LandingHeroDeal";

export default function Home() {
  return (
    <>
      <Header />
      {/* 모바일: 오늘의 초특가 최상단 / 데스크톱: 기존 순서(Hero 먼저) — order로 뷰포트별 분리 */}
      <main className="flex flex-1 flex-col pb-40 lg:pb-0">
        <div className="order-1 lg:order-2">
          <LandingHeroDeal />
        </div>
        <div className="order-2 lg:order-1">
          <Hero />
        </div>
        <div className="order-last">
          <TrustSection />
        </div>
      </main>
      <Footer />
      <FloatingDeals />
    </>
  );
}
