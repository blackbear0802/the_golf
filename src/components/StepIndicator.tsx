// 예약 플로우 3단계 진행 표시줄 (탐색 → 예약 문의 → 완료)
const STEPS = ["탐색", "예약 문의", "접수 완료"] as const;

export default function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="mx-auto flex max-w-3xl items-center gap-2 px-5 py-5 md:px-8 md:py-6">
      {STEPS.map((label, idx) => {
        const step = idx + 1;
        const active = step === current;
        const done = step < current;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={[
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-lg font-black",
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
                "text-sm md:text-base font-bold whitespace-nowrap",
                active ? "text-warm-600" : done ? "text-neutral-700" : "text-neutral-400",
              ].join(" ")}
            >
              {label}
            </span>
            {step < STEPS.length && (
              <div
                className={[
                  "ml-1 h-1 flex-1 rounded-full",
                  done ? "bg-warm-500" : "bg-neutral-200",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
