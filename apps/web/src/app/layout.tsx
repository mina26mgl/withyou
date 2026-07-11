import type { Metadata } from 'next';
import { Inter, EB_Garamond, Meow_Script } from 'next/font/google';
import localFont from 'next/font/local';
import '@/styles/globals.css';

const playfair = localFont({
  src: [
    {
      path: '../../public/fonts/PlayfairDisplay.ttf',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PlayfairDisplay-Italic.ttf',
      style: 'italic',
    },
  ],
  variable: '--font-playfair',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-eb-garamond',
  display: 'swap',
});

const meowScript = Meow_Script({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-meow-script',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WithYou — Beauté & Cosmétique',
  description: 'Marketplace beauté et cosmétique algérienne',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${playfair.variable} ${inter.variable} ${ebGaramond.variable} ${meowScript.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
