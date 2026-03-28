import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import { ThemeProvider } from '@/components/ThemeProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '할일 관리',
  description: '매일 할일을 빠르고 보기 쉽게 관리하는 서비스',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-neutral-900 antialiased transition-colors dark:bg-neutral-950 dark:text-neutral-100">
        <ThemeProvider>
          <Header />
          <main className="flex-1 bg-white transition-colors dark:bg-neutral-950">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
