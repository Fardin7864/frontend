import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LuxeGlow – Flash Sale',
  description: 'Cosmetics flash sale with 2 minute stock reservations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
          {/* Brand header */}
          <header className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500 flex items-center justify-center shadow-md">
                <span className="text-xs font-semibold tracking-[0.15em] text-white">
                  LG
                </span>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-semibold tracking-wide">
                  LuxeGlow
                </div>
                <div className="text-xs sm:text-sm text-slate-500">
                  Limited-time beauty flash sale
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-right text-slate-500">
              <div>2-minute stock reservation</div>
              <div className="text-[11px] sm:text-xs">
                Complete your glow before time runs out
              </div>
            </div>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
