// 어드민 회원 상세 (회원 정보 + 예약 이력 + 문의 세션)
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTimeKST, formatDateKST } from "@/lib/format-datetime";
import { baseEmail } from "@/lib/member";
import { genderLabel } from "@/lib/signup-options";
import MemberRoleSelect from "@/components/admin/MemberRoleSelect";
import MemberDeleteButton from "@/components/admin/MemberDeleteButton";

const BOOKING_STATUS_LABEL = {
  pending: "접수 대기",
  contacted: "상담 진행",
  confirmed: "예약 확정",
  cancelled: "취소",
} as const;

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isSelf = id === session?.user?.id;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: { destination: true, golfCourse: true, departureDate: true, departureLabel: true },
          },
        },
      },
      chatSessions: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { messages: true } } },
      },
    },
  });

  if (!user) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/members" className="text-sm font-bold text-neutral-500 hover:underline">
        ← 회원 목록
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900">
            {user.name ?? "(이름 없음)"}
            {user.deletedAt && (
              <span className="ml-2 align-middle rounded-full bg-brand-100 px-2.5 py-1 text-sm font-bold text-brand-700">
                탈퇴
              </span>
            )}
          </h1>
          <p className="mt-1 font-mono text-xs text-neutral-400">{user.id}</p>
        </div>
        <div className="flex items-end gap-2">
          <MemberRoleSelect userId={user.id} currentRole={user.role} disabled={isSelf} />
          <MemberDeleteButton userId={user.id} deleted={!!user.deletedAt} disabled={isSelf} />
        </div>
      </div>

      <section className="mt-6 grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:grid-cols-2">
        <InfoRow label="이메일" value={baseEmail(user.email) ?? "-"} />
        <InfoRow label="전화" value={user.phone ?? "-"} />
        <InfoRow label="역할" value={user.role === "admin" ? "관리자" : "일반 회원"} />
        <InfoRow label="카카오 연동" value={user.kakaoId ? "연동됨" : "-"} />
        <InfoRow label="생년월일" value={user.birthDate ? formatDateKST(user.birthDate) ?? "-" : "-"} />
        <InfoRow label="성별" value={genderLabel(user.gender) ?? "-"} />
        <InfoRow label="골프 구력" value={user.golfCareer ?? "-"} />
        <InfoRow label="핸디캡" value={user.handicap ?? "-"} />
        <InfoRow label="거주 지역" value={user.region ?? "-"} />
        <InfoRow label="마케팅 수신" value={user.marketingAgreedAt ? "동의" : "미동의"} />
        <InfoRow label="가입 완료" value={user.signupCompleted ? "완료" : "미완료"} />
        <InfoRow label="가입일" value={formatDateTimeKST(user.createdAt) ?? "-"} />
        {user.deletedAt && (
          <InfoRow label="탈퇴일" value={formatDateTimeKST(user.deletedAt) ?? "-"} />
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black text-neutral-900">
          예약 이력 <span className="text-neutral-400">({user.bookings.length})</span>
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          {user.bookings.length === 0 ? (
            <p className="p-8 text-center text-base text-neutral-500">예약 내역이 없습니다.</p>
          ) : (
            <table className="w-full text-sm md:text-base">
              <thead className="bg-neutral-50 text-sm text-neutral-500">
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 text-left font-bold">접수일</th>
                  <th className="px-4 py-3 text-left font-bold">상품</th>
                  <th className="px-4 py-3 text-left font-bold">인원</th>
                  <th className="px-4 py-3 text-left font-bold">상태</th>
                </tr>
              </thead>
              <tbody>
                {user.bookings.map((b) => (
                  <tr key={b.id} className="border-b border-neutral-100 align-top">
                    <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">
                      {formatDateTimeKST(b.createdAt) ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-neutral-900">
                        {b.product?.destination ?? "-"}
                      </div>
                      {b.product?.golfCourse && (
                        <div className="text-sm text-neutral-600">{b.product.golfCourse}</div>
                      )}
                      {b.product?.departureDate && (
                        <div className="text-xs text-neutral-500">
                          출발 {b.product.departureLabel ?? formatDateKST(b.product.departureDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-neutral-900 whitespace-nowrap">
                      {b.headcount}명
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="rounded-full bg-warm-100 px-2.5 py-1 text-sm font-bold text-warm-700">
                        {BOOKING_STATUS_LABEL[b.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black text-neutral-900">
          문의(AI 챗) 세션 <span className="text-neutral-400">({user.chatSessions.length})</span>
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          {user.chatSessions.length === 0 ? (
            <p className="p-8 text-center text-base text-neutral-500">문의 내역이 없습니다.</p>
          ) : (
            <table className="w-full text-sm md:text-base">
              <thead className="bg-neutral-50 text-sm text-neutral-500">
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 text-left font-bold">세션 시작</th>
                  <th className="px-4 py-3 text-left font-bold">마지막 활동</th>
                  <th className="px-4 py-3 text-left font-bold">메시지 수</th>
                </tr>
              </thead>
              <tbody>
                {user.chatSessions.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-100">
                    <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">
                      {formatDateTimeKST(s.createdAt) ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">
                      {formatDateTimeKST(s.updatedAt) ?? "-"}
                    </td>
                    <td className="px-4 py-3 font-bold text-neutral-900 whitespace-nowrap">
                      {s._count.messages}개
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-neutral-500">{label}</p>
      <p className="mt-1 text-base text-neutral-900 break-all">{value}</p>
    </div>
  );
}
