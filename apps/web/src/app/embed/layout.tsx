// Embed layout - minimal wrapper for embedded content
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AI Business OS - Embedded Analytics',
  description: 'Embedded analytics powered by AI Business OS',
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Allow embedding in iframes */}
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className={inter.className}>
        {/* Minimal wrapper for embeds */}
        <div className="embed-container">
          {children}
        </div>
      </body>
    </html>
  );
}
