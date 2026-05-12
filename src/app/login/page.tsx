// 로그인 페이지 (이메일+비밀번호, 시니어 친화 큰 입력창/버튼)
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-warm-50 px-5 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl md:p-10">
        <Link href="/" className="block text-center">
          <span className="text-3xl font-black text-warm-600">The Golf</span>
        </Link>

        <h1 className="mt-8 text-center text-2xl md:text-3xl font-black text-neutral-900">
          로그인
        </h1>
        <p className="mt-3 text-center text-base text-neutral-600">
          가입하신 이메일로 로그인해주세요
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-base font-bold text-neutral-800">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="mt-2 block h-16 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-lg text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-bold text-neutral-800">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="mt-2 block h-16 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-lg text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-base font-medium text-brand-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="block h-16 w-full rounded-xl bg-warm-500 text-xl font-black text-white transition-colors hover:bg-warm-600 disabled:bg-neutral-300"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-7 text-center text-base text-neutral-600">
          아직 회원이 아니신가요?{" "}
          <Link href="/register" className="font-bold text-warm-600 underline">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
