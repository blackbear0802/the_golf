// 회원 정보 수정 페이지 (프로필 + 비밀번호 변경 두 섹션)
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProfileForm from "@/components/my/ProfileForm";
import PasswordForm from "@/components/my/PasswordForm";

export default async function EditProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/my/edit");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true },
  });

  return (
    <>
      <Header />
      <main className="flex-1 px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/my"
            className="inline-flex items-center gap-1 text-base text-warm-600 hover:underline"
          >
            ← 마이페이지로
          </Link>

          <h1 className="mt-4 text-2xl md:text-3xl font-black text-neutral-900">
            회원 정보 수정
          </h1>
          <p className="mt-2 text-base text-neutral-600">
            이메일은 로그인 ID라서 변경할 수 없어요. ({user?.email ?? "-"})
          </p>

          <div className="mt-8 space-y-6">
            <ProfileForm
              initialName={user?.name ?? ""}
              initialPhone={user?.phone ?? ""}
            />
            <PasswordForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
