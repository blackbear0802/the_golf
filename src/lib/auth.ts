// NextAuth v4 설정 (이메일+비밀번호 CredentialsProvider, JWT 전략)
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// 세션 길이: 기본 30일 → 1일로 단축.
// 사용자가 브라우저 종료 후 며칠 지난 뒤 자동 로그인 상태로 들어오는 걸 막기 위함.
// 1일 유지 + 활동 시 갱신(updateAge 기본 24h)이면 활성 사용자는 끊김 없이 사용.
const ONE_DAY_SECONDS = 60 * 60 * 24;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: ONE_DAY_SECONDS },
  jwt: { maxAge: ONE_DAY_SECONDS },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email ?? "",
          name: user.name ?? "",
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: "user" | "admin" }).role ?? "user";
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
        session.user.role = (token.role as "user" | "admin") ?? "user";
      }
      return session;
    },
  },
};
