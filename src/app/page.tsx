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
      <main className="flex-1 pb-40 lg:pb-0">
        {/* 오늘의 초특가를 최상단에 노출 */}
        <LandingHeroDeal />
        <Hero />
        <TrustSection />
      </main>
      <Footer />
      <FloatingDeals />
    </>
  );
}
