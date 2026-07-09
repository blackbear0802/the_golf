// 어드민 영역 레이아웃 (다크 사이드바 + 권한 체크)
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";

export const metadata: Metadata = {
  title: "어드민",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 md:flex-row">
      <aside className="bg-neutral-900 text-neutral-100 md:w-64 md:flex-shrink-0">
        <div className="flex items-center justify-between px-5 py-5 md:block">
          <Link href="/admin" className="text-xl font-black text-white">
            The Golf · Admin
          </Link>
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-white md:hidden"
          >
            사이트로 이동 →
          </Link>
        </div>
        <nav className="grid grid-cols-3 gap-1 px-3 pb-3 md:grid-cols-1 md:gap-0 md:px-0 md:pb-0">
          <SideLink href="/admin" label="대시보드" />
          <SideLink href="/admin/bookings" label="예약 관리" />
          <SideLink href="/admin/members" label="회원 관리" />
          <SideLink href="/admin/products" label="상품 관리" />
          <SideLink href="/admin/settings" label="설정" />
        </nav>
        <div className="hidden md:block px-5 py-5">
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-white"
          >
            사이트로 이동 →
          </Link>
        </div>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}

function SideLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-4 py-3 text-center text-base font-bold text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white md:rounded-none md:px-5 md:text-left"
    >
      {label}
    </Link>
  );
}
