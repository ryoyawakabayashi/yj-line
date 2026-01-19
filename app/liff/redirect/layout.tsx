import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'YOLO JAPAN',
  description: '日本で暮らすあなたをサポート',
  openGraph: {
    title: 'YOLO JAPAN',
    description: '日本で暮らすあなたをサポート',
    siteName: 'YOLO JAPAN',
    type: 'website',
  },
};

export default function LiffRedirectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
