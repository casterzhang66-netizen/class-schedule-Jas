import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      const slug = user.name
        ? user.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
        : user.email.split("@")[0];

      await prisma.teacher.upsert({
        where: { email: user.email },
        update: {
          name: user.name || "",
          googleAccessToken: account.access_token,
          googleRefreshToken: account.refresh_token,
        },
        create: {
          email: user.email,
          name: user.name || "",
          slug,
          googleAccessToken: account.access_token,
          googleRefreshToken: account.refresh_token,
        },
      });

      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const teacher = await prisma.teacher.findUnique({
          where: { email: session.user.email },
        });
        if (teacher) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const s = session as any;
          s.teacherId = teacher.id;
          s.slug = teacher.slug;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
