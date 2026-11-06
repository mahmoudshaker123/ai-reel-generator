'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutRedirect />
    </Suspense>
  );
}

function CheckoutRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const plan = searchParams.get('plan') || 'pro';
    const cycle = searchParams.get('cycle') || 'annual';
    const cycleSuffix = cycle === 'annual' ? 'year_egp' : 'month_egp';
    router.replace(`/billing/pay?price=${plan}_${cycleSuffix}`);
  }, [router, searchParams]);

  return null;
}
