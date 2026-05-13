// 어드민 예약 관리 (전체 예약 목록 + 상태 변경)
import { prisma } from "@/lib/db";
import BookingStatusSelect from "@/components/admin/BookingStatusSelect";

function formatDate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${m}.${d}`;
}

function formatDateTime(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getFullYear()}.${m}.${d} ${hh}:${mm}`;
}

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { destination: true, golfCourse: true, departureDate: true } },
      user: { select: { name: true, phone: true, email: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-black text-neutral-900">예약 관리</h1>
      <p className="mt-1 text-base text-neutral-600">
        예약 상태를 변경하면 즉시 반영됩니다 ({bookings.length}건)
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        {bookings.length === 0 ? (
          <p className="p-10 text-center text-base text-neutral-500">
            예약 내역이 없습니다.
          </p>
        ) : (
          <table className="w-full text-sm md:text-base">
            <thead className="bg-neutral-50 text-sm text-neutral-500">
              <tr className="border-b border-neutral-200">
                <th className="px-4 py-3 text-left font-bold">접수일</th>
                <th className="px-4 py-3 text-left font-bold">고객</th>
                <th className="px-4 py-3 text-left font-bold">상품</th>
                <th className="px-4 py-3 text-left font-bold">인원</th>
                <th className="px-4 py-3 text-left font-bold">요청사항</th>
                <th className="px-4 py-3 text-left font-bold">상태</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-neutral-100 align-top">
                  <td className="px-4 py-4 text-sm text-neutral-600 whitespace-nowrap">
                    {formatDateTime(b.createdAt)}
                    <div className="mt-1 font-mono text-xs text-neutral-400">
                      {b.id.slice(-8)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-bold text-neutral-900">
                      {b.user.name ?? "-"}
                    </div>
                    <div className="text-sm text-neutral-600">
                      {b.user.phone ?? "-"}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {b.user.email ?? "-"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-bold text-neutral-900">
                      {b.product?.destination ?? "-"}
                    </div>
                    {b.product?.golfCourse && (
                      <div className="text-sm text-neutral-600">
                        {b.product.golfCourse}
                      </div>
                    )}
                    {b.product?.departureDate && (
                      <div className="text-xs text-neutral-500">
                        출발 {formatDate(b.product.departureDate)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 font-bold text-neutral-900 whitespace-nowrap">
                    {b.headcount}명
                  </td>
                  <td className="px-4 py-4 max-w-xs text-sm text-neutral-700">
                    {b.additionalRequest ?? <span className="text-neutral-400">-</span>}
                  </td>
                  <td className="px-4 py-4">
                    <BookingStatusSelect bookingId={b.id} currentStatus={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
