import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// 許可するメールアドレスのドメイン（YOLO JAPANのドメイン）
const ALLOWED_DOMAINS = ['yolo-japan.com', 'yolo-japan.co.jp'];

// 個別に許可するメールアドレス
const ALLOWED_EMAILS = (process.env.ALLOWED_DASHBOARD_EMAILS || '').split(',').filter(Boolean);

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      // 許可ドメインチェック
      const domain = email.split('@')[1];
      if (ALLOWED_DOMAINS.includes(domain)) {
        return true;
      }

      // 個別許可メールチェック
      if (ALLOWED_EMAILS.includes(email)) {
        return true;
      }

      console.log(`❌ ログイン拒否: ${email}`);
      return false;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
