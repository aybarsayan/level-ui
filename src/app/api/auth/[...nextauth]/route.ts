import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from '@/lib/mongodb';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    async signIn({ user, account, profile }) {
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Eğer URL chat ile başlıyorsa veya baseUrl ile başlıyorsa, o URL'yi kullan
      if (url.startsWith('/chat') || url.startsWith(baseUrl)) {
        return `${baseUrl}/chat`;
      }
      return baseUrl;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/', // Hata durumunda ana sayfaya yönlendir
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST }; 