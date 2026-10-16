import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-paper p-4 md:p-8"><header className="mx-auto mb-8 flex max-w-6xl items-center justify-between rounded-2xl border-2 border-black bg-white p-4 shadow-sticker"><Link href="/" className="font-bold">🌷 tiệm xíu xiu</Link><span className="font-bold">Góc chủ tiệm</span></header><main className="mx-auto max-w-6xl">{children}</main></div>;
}
