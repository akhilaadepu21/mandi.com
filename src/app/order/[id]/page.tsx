'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { OrderTracker } from '@/components/customer/OrderTracker';
import { ErrorState, Loading } from '@/components/shared/States';
import { ToastViewport } from '@/components/shared/Toast';

function OrderPageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorState title="Missing order link" description="Use the link you received after placing your order." />
      </div>
    );
  }

  return (
    <>
      <OrderTracker orderId={params.id} accessToken={token} />
      <ToastViewport />
    </>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderPageInner />
    </Suspense>
  );
}
