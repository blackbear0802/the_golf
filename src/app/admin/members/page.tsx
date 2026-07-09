// 어드민 회원 관리 (회원 목록 + 검색 + 활성/탈퇴 필터 + 역할 변경 + 탈퇴 처리)
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTimeKST } from "@/lib/format-datetime";
import MemberRoleSelect from "@/components/admin/MemberRoleSelect";
import MemberDeleteButton from "@/components/admin/MemberDeleteButton";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() ?? "";
  const status = params.status === "deleted" ? "deleted" : "active";

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  const where: Prisma.UserWhereInput = {
    deletedAt: status === "deleted" ? { not: null } : null,
  };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-black text-neutral-900">회원 관리</h1>
      <p className="mt-1 text-base text-neutral-600">
        {status === "deleted" ? "탈퇴" : "활성"} 회원 {users.length}명
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="이름·이메일·전화 검색"
            className="h-10 w-56 rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:border-warm-500 focus:outline-none"
          />
          <button
            type="submit"
            className="h-10 rounded-lg bg-neutral-900 px-4 text-sm font-bold text-white hover:bg-neutral-700"
          >
            검색
          </button>
        </form>

        <div className="flex gap-1">
          <FilterTab label="활성" href={`/admin/members${q ? `?q=${encodeURIComponent(q)}` : ""}`} active={status === "active"} />
          <FilterTab
            label="탈퇴"
            href={`/admin/members?status=deleted${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={status === "deleted"}
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        {users.length === 0 ? (
          <p className="p-10 text-center text-base text-neutral-500">
            {q ? "검색 결과가 없습니다." : "회원이 없습니다."}
          </p>
        ) : (
          <table className="w-full text-sm md:text-base">
            <thead className="bg-neutral-50 text-sm text-neutral-500">
              <tr className="border-b border-neutral-200">
                <th className="px-4 py-3 text-left font-bold">회원</th>
                <th className="px-4 py-3 text-left font-bold">연락처</th>
                <th className="px-4 py-3 text-left font-bold">가입일</th>
                <th className="px-4 py-3 text-left font-bold">예약</th>
                <th className="px-4 py-3 text-left font-bold">역할</th>
                <th className="px-4 py-3 text-left font-bold">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-b border-neutral-100 align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/members/${u.id}`}
                        className="font-bold text-neutral-900 hover:text-warm-600 hover:underline"
                      >
                        {u.name ?? "(이름 없음)"}
                      </Link>
                      {isSelf && (
                        <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs font-bold text-neutral-600">
                          나
                        </span>
                      )}
                      <div className="mt-1 font-mono text-xs text-neutral-400">
                        {u.id.slice(-8)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-neutral-800">{u.email ?? "-"}</div>
                      <div className="text-sm text-neutral-500">{u.phone ?? "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-600 whitespace-nowrap">
                      {formatDateTimeKST(u.createdAt) ?? "-"}
                    </td>
                    <td className="px-4 py-4 font-bold text-neutral-900 whitespace-nowrap">
                      {u._count.bookings}건
                    </td>
                    <td className="px-4 py-4">
                      <MemberRoleSelect
                        userId={u.id}
                        currentRole={u.role}
                        disabled={isSelf}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <MemberDeleteButton
                        userId={u.id}
                        deleted={!!u.deletedAt}
                        disabled={isSelf}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FilterTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-lg px-4 py-2 text-sm font-bold transition-colors",
        active
          ? "bg-neutral-900 text-white"
          : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-300",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
