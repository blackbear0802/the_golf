// 월×지역 교차 매트릭스 표 (4단계 Sticky, 활성 셀만 /search 딥링크)
import Link from "next/link";

export type MatrixRow = {
  regionCode: string;
  countryCode: string;
  countryName: string;
  regionName: string;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

// border 대신 inset shadow — sticky 셀 경계 1px gap 버그 우회 (설계서 채택)
const HEADER_SHADOW = "shadow-[inset_0_-1px_0_0_#e5e7eb]";
const FIRSTCOL_SHADOW = "shadow-[inset_-1px_0_0_0_#e5e7eb]";
const CORNER_SHADOW = "shadow-[inset_-1px_-1px_0_0_#e5e7eb]";

export default function MatrixGrid({
  year,
  rows,
  counts,
}: {
  year: number;
  rows: MatrixRow[];
  /** counts[regionCode][month(1~12)] = 상품 수 */
  counts: Record<string, Record<number, number>>;
}) {
  return (
    <div className="overflow-x-auto overscroll-x-none rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full border-separate border-spacing-0 text-sm md:text-base">
        <thead>
          <tr>
            <th
              scope="col"
              className={`sticky left-0 top-0 z-30 min-w-[8.5rem] bg-neutral-50 px-4 py-3 text-left font-bold text-neutral-500 ${CORNER_SHADOW}`}
            >
              {year}년 지역 / 월
            </th>
            {MONTHS.map((m) => (
              <th
                key={m}
                scope="col"
                className={`sticky top-0 z-20 min-w-[4.5rem] bg-neutral-50 px-3 py-3 text-center font-bold text-neutral-600 ${HEADER_SHADOW}`}
              >
                {m}월
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.regionCode}>
              <th
                scope="row"
                className={`sticky left-0 z-10 min-w-[8.5rem] bg-white px-4 py-3 text-left ${FIRSTCOL_SHADOW}`}
              >
                <div className="font-bold text-neutral-900">{row.regionName}</div>
                <div className="text-xs text-neutral-500">{row.countryName}</div>
              </th>
              {MONTHS.map((m) => {
                const count = counts[row.regionCode]?.[m] ?? 0;
                const mm = String(m).padStart(2, "0");
                if (count === 0) {
                  return (
                    <td
                      key={m}
                      aria-label={`${year}년 ${m}월 ${row.countryName} ${row.regionName} 상품 없음`}
                      className="cursor-not-allowed bg-neutral-50/60 px-3 py-3 text-center text-neutral-300"
                    >
                      ·
                    </td>
                  );
                }
                return (
                  <td key={m} className="p-0 text-center">
                    <Link
                      href={`/search?countryCode=${row.countryCode}&regionCode=${row.regionCode}&month=${year}-${mm}`}
                      aria-label={`${year}년 ${m}월 ${row.countryName} ${row.regionName} 골프 상품 ${count}건, 목록 보기`}
                      className="flex h-full w-full items-center justify-center px-3 py-3 font-bold text-warm-700 transition-colors hover:bg-warm-50"
                    >
                      {count}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
