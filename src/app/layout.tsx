import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reel Studio — AI-Powered Video Editor',
  description: 'Create stunning Reels, TikToks, and YouTube Shorts with AI-powered editing tools',
  keywords: 'reel editor, video editor, AI video, TikTok editor, YouTube Shorts, Arabic captions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
