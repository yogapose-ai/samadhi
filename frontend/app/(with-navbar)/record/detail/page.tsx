import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
} from "@/components/ui";
import RecordDetailClient from "./RecordDetailClient";

/** 이 페이지는 쿼리스트링에 의존하므로 정적 프리렌더 대신 동적 렌더링 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function FallbackCard() {
  return (
    <Card className='m-6'>
      <CardHeader className='flex flex-row items-center gap-2'>
        <Loader2 className='h-5 w-5 animate-spin' aria-hidden />
        <CardTitle>불러오는 중…</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className='mt-4 space-y-3'>
        <Skeleton className='h-5 w-40' />
        <Skeleton className='h-4 w-3/5' />
        <Skeleton className='h-4 w-2/5' />
        <Skeleton className='h-32 w-full' />
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<FallbackCard />}>
      <RecordDetailClient />
    </Suspense>
  );
}
