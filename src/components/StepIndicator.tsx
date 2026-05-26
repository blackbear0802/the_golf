// 예약 플로우 3단계 진행 표시줄 (탐색 → 예약 문의 → 완료)
// 모바일에서 가로 스크롤이 생기지 않도록 라벨을 원 아래에 stack해 가로 폭을 압축
const STEPS = ["탐색", "예약 문의", "접수 완료"] as const;

export default function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mx-auto flex max-w-3xl items-start gap-1 sm:gap-2 px-4 md:px-8 py-5 md:py-6">
      {STEPS.map((label, idx) => {
        const step = idx + 1;
        const isLast = step === STEPS.length;
        const active = step === current;
        const done = step < current;
        return (
          <li
            key={label}
            className={[
              "flex items-start",
              isLast ? "shrink-0" : "flex-1 gap-1 sm:gap-2",
            ].join(" ")}
            aria-current={active ? "step" : undefined}
          >
            <div className="flex flex-col items-center shrink-0">
              <div
                className={[
                  "flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg font-black",
                  active
                    ? "border-warm-500 bg-warm-500 text-white"
                    : done
                      ? "border-warm-500 bg-white text-warm-600"
                      : "border-neutral-300 bg-white text-neutral-400",
                ].join(" ")}
              >
                {done ? "✓" : step}
              </div>
              <span
                className={[
                  "mt-1.5 text-xs sm:text-sm md:text-base font-bold whitespace-nowrap",
                  active
                    ? "text-warm-600"
                    : done
                      ? "text-neutral-700"
                      : "text-neutral-400",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={[
                  // 원 세로 중앙(=24px)에 맞춰 mt-6, 좁은 화면에서도 보이도록 min-w 보장
                  "mt-6 h-1 flex-1 min-w-[12px] rounded-full",
                  done ? "bg-warm-500" : "bg-neutral-200",
                ].join(" ")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
