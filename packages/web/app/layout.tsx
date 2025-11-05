import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { ToastProvider } from '@/components/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AadhaarChain - Self-Sovereign Identity Platform',
  description: 'Revolutionary Solana-based identity platform bridging India\'s government-grade identity verification with decentralized ownership.',
  keywords: ['Aadhaar', 'Solana', 'Blockchain', 'Identity', 'Self-Sovereign', 'DID', 'Web3'],
  authors: [{ name: 'AadhaarChain Team' }],
  openGraph: {
    type: 'website',
    title: 'AadhaarChain - Self-Sovereign Identity Platform',
    description: 'Revolutionary Solana-based identity platform bridging India\'s government-grade identity verification with decentralized ownership.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <WalletProvider>
          <ToastProvider>
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
