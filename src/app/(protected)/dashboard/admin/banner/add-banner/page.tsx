import AddBanner from '@/components/banner/addbanner';
import { Suspense } from 'react';

export default function AddBannerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddBanner />
    </Suspense>
  );
}