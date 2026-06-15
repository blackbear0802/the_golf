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
      <main className="flex-1">
        {/* 모바일은 특가 위젯을 최상단 인플로우로, 데스크톱은 우측 고정 사이드바로 렌더 */}
        <FloatingDeals />
        <Hero />
        <LandingHeroDeal />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
