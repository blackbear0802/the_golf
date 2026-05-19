// 어드민 빠른 등록 폼 — 본문 붙여넣기 + 이미지 드롭 → 클라이언트가 Blob 업로드 후 AI 생성
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import JSZip from "jszip";
import { cleanPostText } from "@/lib/clean-post-text";

const IMG_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export default function QuickProductForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [youtube, setYoutube] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const docxRef = useRef<HTMLInputElement>(null);
  const [docxNote, setDocxNote] = useState("");

  async function loadDocx(file: File) {
    setError("");
    setDocxNote("Word 파일 분석 중 …");
    try {
      const zip = await JSZip.loadAsync(file);
      const docXml = await zip.file("word/document.xml")?.async("string");
      if (!docXml) {
        setDocxNote("");
        setError(".docx 문서를 읽을 수 없습니다 (형식 확인).");
        return;
      }
      const t = cleanPostText(
        docXml
          .replace(/<\/w:p>/g, "\n")
          .replace(/<w:tab\s*\/>/g, "\t")
          .replace(/<w:br\s*\/>/g, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&#x([0-9a-fA-F]+);/g, (_, c) =>
            String.fromCodePoint(parseInt(c, 16))
          )
          .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(parseInt(c, 10)))
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
      );
      const names = Object.keys(zip.files).filter((n) =>
        /^word\/media\/.+\.(jpe?g|png|gif|webp)$/i.test(n)
      );
      const imgs: File[] = [];
      for (const name of names) {
        const ext = name.split(".").pop()!.toLowerCase();
        const blob = await zip.files[name].async("blob");
        imgs.push(
          new File([blob], name.split("/").pop()!, {
            type: IMG_MIME[ext] ?? "image/jpeg",
          })
        );
      }
      if (t) setText(t);
      if (imgs.length) setFiles((prev) => [...prev, ...imgs]);
      setDocxNote(`Word에서 불러옴 — 본문 ${t.length}자 · 이미지 ${imgs.length}장`);
    } catch {
      setDocxNote("");
      setError("Word 파일 분석 실패.");
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imgs]);
    if (error) setError("");
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!text.trim()) {
      setError("본문을 입력해주세요.");
      return;
    }
    setBusy(true);

    const imageUrls: string[] = [];
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setStatus(`이미지 업로드 ${i + 1}/${files.length} …`);
      try {
        const res = await upload(f.name, f, {
          access: "public",
          handleUploadUrl: "/api/admin/blob-upload",
          contentType: f.type,
        });
        imageUrls.push(res.url);
      } catch {
        failed.push(f.name);
      }
    }

    const youtubeUrls = youtube
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    setStatus("AI 분석 중 …");
    const res = await fetch("/api/admin/products/quick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), imageUrls, youtubeUrls }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "등록에 실패했습니다.");
      setBusy(false);
      setStatus("");
      return;
    }

    const { id } = (await res.json()) as { id: string };
    if (failed.length > 0) {
      setStatus(`완료 (이미지 ${failed.length}장 업로드 실패 — 수정화면에서 보완)`);
    }
    router.push(`/admin/products/${id}/edit`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border-2 border-warm-200 bg-warm-50/50 p-5">
        <p className="text-base font-black text-neutral-900">
          📄 Word(.docx)에서 한 번에 불러오기
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          원본 글을 붙여넣은 Word 파일을 올리면 본문과 안에 든 이미지를 자동으로 채웁니다.
          (band.us 링크는 이미지로 불러올 수 없어 Word 임베드 이미지를 사용)
        </p>
        <button
          type="button"
          onClick={() => docxRef.current?.click()}
          disabled={busy}
          className="mt-3 flex h-12 items-center rounded-xl border-2 border-warm-300 bg-white px-5 text-base font-bold text-warm-700 transition-colors hover:bg-warm-50 disabled:opacity-50"
        >
          Word 파일 선택 (.docx)
        </button>
        <input
          ref={docxRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadDocx(f);
            e.target.value = "";
          }}
        />
        {docxNote && (
          <p className="mt-3 text-sm font-medium text-warm-700">{docxNote}</p>
        )}
      </div>

      <div>
        <label htmlFor="qtext" className="block text-base font-bold text-neutral-800">
          게시글 본문 *
        </label>
        <p className="mt-1 text-sm text-neutral-500">
          밴드 글 텍스트를 그대로 붙여넣으세요. 연락처는 자동 제거됩니다.
        </p>
        <textarea
          id="qtext"
          rows={14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예) 🇻🇳 다낭 골프투어 4박5일 … 출발 7월~8월 … 159만원 …"
          className="mt-2 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <p className="block text-base font-bold text-neutral-800">이미지 (선택)</p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`mt-2 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-warm-500 bg-warm-50" : "border-neutral-300 bg-neutral-50"
          }`}
        >
          <p className="text-base font-bold text-neutral-700">
            이미지 파일을 드래그하거나 클릭해서 선택
          </p>
          <p className="mt-1 text-sm text-neutral-500">여러 장 가능 · jpg/png/webp/gif</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <p className="mt-2 text-sm text-neutral-500">{files.length}장 선택됨</p>
        )}
      </div>

      <div>
        <label htmlFor="qyoutube" className="block text-base font-bold text-neutral-800">
          유튜브 링크 (선택)
        </label>
        <p className="mt-1 text-sm text-neutral-500">한 줄에 하나씩. 영상으로 등록됩니다.</p>
        <textarea
          id="qyoutube"
          rows={3}
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
          placeholder={"https://www.youtube.com/watch?v=...\nhttps://youtu.be/..."}
          className="mt-2 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-base font-medium text-brand-700">
          {error}
        </p>
      )}
      {busy && status && (
        <p className="rounded-xl bg-warm-50 px-4 py-3 text-base font-medium text-warm-700">
          {status}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="flex h-14 items-center rounded-xl bg-warm-500 px-8 text-lg font-black text-white transition-colors hover:bg-warm-600 disabled:bg-neutral-300"
        >
          {busy ? "처리 중 …" : "AI로 상품 등록"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          disabled={busy}
          className="flex h-14 items-center rounded-xl border-2 border-neutral-300 px-6 text-lg font-bold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}
