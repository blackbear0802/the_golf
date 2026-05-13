// 어드민 상품 등록/수정 공용 폼 (신규: mode=create, 수정: mode=edit + productId)
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type ProductFormInitial = {
  destination: string;
  golfCourse: string;
  departureDate: string;
  nights: number | "";
  price: number | "";
  capacity: number | "";
  deadline: string;
  included: string;
  excluded: string;
  sourceUrl: string;
  rawText: string;
};

export const EMPTY_PRODUCT_FORM: ProductFormInitial = {
  destination: "",
  golfCourse: "",
  departureDate: "",
  nights: "",
  price: "",
  capacity: "",
  deadline: "",
  included: "",
  excluded: "",
  sourceUrl: "",
  rawText: "",
};

type Props =
  | { mode: "create"; initial?: undefined; productId?: undefined }
  | { mode: "edit"; initial: ProductFormInitial; productId: string };

export default function ProductForm(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ProductFormInitial>(
    props.mode === "edit" ? props.initial : EMPTY_PRODUCT_FORM
  );
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  function update<K extends keyof ProductFormInitial>(
    key: K,
    value: ProductFormInitial[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      destination: form.destination.trim(),
      golfCourse: form.golfCourse.trim() || null,
      departureDate: form.departureDate,
      nights: form.nights === "" ? null : Number(form.nights),
      price: form.price === "" ? null : Number(form.price),
      capacity: form.capacity === "" ? null : Number(form.capacity),
      deadline: form.deadline || null,
      included: splitLines(form.included),
      excluded: splitLines(form.excluded),
      sourceUrl: form.sourceUrl.trim() || null,
      rawText: form.rawText.trim() || null,
    };

    const url =
      props.mode === "create"
        ? "/api/admin/products"
        : `/api/admin/products/${props.productId}`;
    const method = props.mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "저장에 실패했습니다.");
      return;
    }

    startTransition(() => {
      router.push("/admin/products");
      router.refresh();
    });
  }

  async function handleDelete() {
    if (props.mode !== "edit") return;
    if (!confirm("이 상품을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setError("");
    setDeleting(true);
    const res = await fetch(`/api/admin/products/${props.productId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "삭제에 실패했습니다.");
      setDeleting(false);
      return;
    }
    startTransition(() => {
      router.push("/admin/products");
      router.refresh();
    });
  }

  const busy = pending || deleting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="목적지 *" htmlFor="destination">
          <input
            id="destination"
            type="text"
            value={form.destination}
            onChange={(e) => update("destination", e.target.value)}
            placeholder="태국 방콕"
            className={inputClass}
            required
          />
        </Field>

        <Field label="골프장" htmlFor="golfCourse">
          <input
            id="golfCourse"
            type="text"
            value={form.golfCourse}
            onChange={(e) => update("golfCourse", e.target.value)}
            placeholder="알파인 골프 리조트"
            className={inputClass}
          />
        </Field>

        <Field label="출발일 *" htmlFor="departureDate">
          <input
            id="departureDate"
            type="date"
            value={form.departureDate}
            onChange={(e) => update("departureDate", e.target.value)}
            className={inputClass}
            required
          />
        </Field>

        <Field label="마감일" htmlFor="deadline">
          <input
            id="deadline"
            type="date"
            value={form.deadline}
            onChange={(e) => update("deadline", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="박수 *" htmlFor="nights">
          <input
            id="nights"
            type="number"
            min={1}
            value={form.nights}
            onChange={(e) =>
              update("nights", e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="5"
            className={inputClass}
            required
          />
        </Field>

        <Field label="가격 (원) *" htmlFor="price">
          <input
            id="price"
            type="number"
            min={0}
            step={10000}
            value={form.price}
            onChange={(e) =>
              update("price", e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="1290000"
            className={inputClass}
            required
          />
        </Field>

        <Field label="정원 (명) *" htmlFor="capacity">
          <input
            id="capacity"
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) =>
              update("capacity", e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="16"
            className={inputClass}
            required
          />
        </Field>

        <Field label="원본 URL" htmlFor="sourceUrl">
          <input
            id="sourceUrl"
            type="url"
            value={form.sourceUrl}
            onChange={(e) => update("sourceUrl", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="포함사항 (한 줄에 하나)" htmlFor="included">
        <textarea
          id="included"
          rows={5}
          value={form.included}
          onChange={(e) => update("included", e.target.value)}
          placeholder={"왕복 항공권\n4박 5라운드\n그린피·카트피"}
          className={`${inputClass} h-auto`}
        />
      </Field>

      <Field label="불포함사항 (한 줄에 하나)" htmlFor="excluded">
        <textarea
          id="excluded"
          rows={4}
          value={form.excluded}
          onChange={(e) => update("excluded", e.target.value)}
          placeholder={"여행자보험\n캐디 팁"}
          className={`${inputClass} h-auto`}
        />
      </Field>

      <Field label="원문 메모" htmlFor="rawText">
        <textarea
          id="rawText"
          rows={4}
          value={form.rawText}
          onChange={(e) => update("rawText", e.target.value)}
          placeholder="공급자 원문 텍스트 (관리용)"
          className={`${inputClass} h-auto`}
        />
      </Field>

      {error && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-base font-medium text-brand-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="flex h-14 items-center rounded-xl bg-warm-500 px-8 text-lg font-black text-white transition-colors hover:bg-warm-600 disabled:bg-neutral-300"
        >
          {pending ? "저장 중..." : props.mode === "create" ? "등록하기" : "저장하기"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          disabled={busy}
          className="flex h-14 items-center rounded-xl border-2 border-neutral-300 px-6 text-lg font-bold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          취소
        </button>
        {props.mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="ml-auto flex h-14 items-center rounded-xl border-2 border-brand-300 px-6 text-lg font-bold text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-50"
          >
            {deleting ? "삭제 중..." : "삭제"}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-base font-bold text-neutral-800">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const inputClass =
  "block h-14 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-lg text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none";
