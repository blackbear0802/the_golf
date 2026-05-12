// 상품 검색 필터 (URL searchParams 기반 폼)
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchFilters({
  destinations,
}: {
  destinations: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [destination, setDestination] = useState(params.get("destination") ?? "");
  const [nights, setNights] = useState(params.get("nights") ?? "");
  const [priceRange, setPriceRange] = useState(params.get("price") ?? "");
  const [sort, setSort] = useState(params.get("sort") ?? "departure");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (destination) sp.set("destination", destination);
    if (nights) sp.set("nights", nights);
    if (priceRange) sp.set("price", priceRange);
    if (sort) sp.set("sort", sort);
    router.push(`/search?${sp.toString()}`);
  }

  function reset() {
    setQ("");
    setDestination("");
    setNights("");
    setPriceRange("");
    setSort("departure");
    router.push("/search");
  }

  const fieldClass =
    "h-14 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-lg text-neutral-900 focus:border-warm-500 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border-2 border-warm-100 bg-white p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <label className="block lg:col-span-2">
          <span className="block text-sm font-bold text-neutral-700">검색어</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="예: 치앙마이"
            className={`mt-2 ${fieldClass}`}
          />
        </label>

        <label className="block">
          <span className="block text-sm font-bold text-neutral-700">목적지</span>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className={`mt-2 ${fieldClass}`}
          >
            <option value="">전체</option>
            {destinations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-bold text-neutral-700">기간</span>
          <select
            value={nights}
            onChange={(e) => setNights(e.target.value)}
            className={`mt-2 ${fieldClass}`}
          >
            <option value="">전체</option>
            <option value="3">3박</option>
            <option value="4">4박</option>
            <option value="5">5박 이상</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-bold text-neutral-700">가격대</span>
          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className={`mt-2 ${fieldClass}`}
          >
            <option value="">전체</option>
            <option value="under150">150만원 이하</option>
            <option value="150to180">150~180만원</option>
            <option value="over180">180만원 이상</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-3 text-base">
          <span className="font-bold text-neutral-700">정렬</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-base font-medium focus:border-warm-500 focus:outline-none"
          >
            <option value="departure">출발일 빠른 순</option>
            <option value="price-asc">가격 낮은 순</option>
            <option value="price-desc">가격 높은 순</option>
          </select>
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="h-14 rounded-xl border-2 border-neutral-300 px-5 text-lg font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            초기화
          </button>
          <button
            type="submit"
            className="h-14 rounded-xl bg-warm-500 px-8 text-lg font-black text-white transition-colors hover:bg-warm-600"
          >
            검색하기
          </button>
        </div>
      </div>
    </form>
  );
}
