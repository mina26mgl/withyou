import type { Metadata, Viewport } from 'next';
import { Inter, EB_Garamond, Meow_Script, Averia_Serif_Libre } from 'next/font/google';
import localFont from 'next/font/local';
import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
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

const averia = Averia_Serif_Libre({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-averia',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WithYou — Beauté & Cosmétique',
  description: 'Marketplace beauté et cosmétique algérienne',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr" className={`${playfair.variable} ${inter.variable} ${ebGaramond.variable} ${meowScript.variable} ${averia.variable}`}>
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
