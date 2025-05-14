import type { Metadata } from 'next';
import { Geist } from 'next/font/google'; // Using Geist Sans as primary font
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Added Toaster

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// Removed Geist Mono as it's not specified in the design, simplifying font loading.

export const metadata: Metadata = {
  title: 'TieTrack', // Updated application title
  description: 'Gerencie seu inventário de gravatas com o TieTrack.', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        <Toaster /> {/* Added Toaster component */}
      </body>
    </html>
  );
}
