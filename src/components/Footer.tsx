// 푸터 (회사 정보 + 고객센터 안내)
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-warm-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-2xl font-black text-warm-600">The Golf</p>
            <p className="mt-2 text-base text-neutral-600">
              시니어를 위한 맞춤형 골프 투어 큐레이션 플랫폼
            </p>
          </div>

          <div>
            <p className="text-lg font-bold text-neutral-900">고객센터</p>
            <p className="mt-2 text-xl font-black text-warm-600">1588-0000</p>
            <p className="mt-1 text-base text-neutral-600">
              평일 09:00 ~ 18:00
            </p>
          </div>

          <div>
            <p className="text-lg font-bold text-neutral-900">상담 안내</p>
            <p className="mt-2 text-base text-neutral-600 leading-relaxed">
              예약 문의 후 24시간 이내에 전문 상담원이 직접 전화드립니다.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-200 pt-6 text-sm text-neutral-500">
          © 2026 The Golf. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
