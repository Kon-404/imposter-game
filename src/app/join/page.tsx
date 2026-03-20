'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function JoinRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  useEffect(() => {
    // Store the code so the home page can pre-fill the join form
    if (code) {
      sessionStorage.setItem('imposter_join_code', code.toUpperCase());
    }
    router.replace('/');
  }, [code, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-muted">Redirecting...</div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="text-muted">Loading...</div></div>}>
      <JoinRedirect />
    </Suspense>
  );
}
