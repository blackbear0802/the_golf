// 홈 페이지 (Header + Hero + 신뢰 섹션 + Footer + 우측 고정 플로팅 추천)
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustSection from "@/components/TrustSection";
import Footer from "@/components/Footer";
import FloatingDeals from "@/components/FloatingDeals";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 pb-40 lg:pb-0">
        <Hero />
        <TrustSection />
      </main>
      <Footer />
      <FloatingDeals />
    </>
  );
}
