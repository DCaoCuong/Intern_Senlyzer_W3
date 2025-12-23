'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the main content component
const HomeContent = dynamic(() => import('./HomeContent').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Đang tải...</p>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Đang chuyển hướng...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}