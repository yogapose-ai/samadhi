"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  Loader2,
  Menu,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Slider,
} from "@/components/ui";

dayjs.extend(isBetween);

/* ── 타입 ── */
interface Segment {
  startSec: number;
  endSec: number;
  pose: string;
  mean: number;
}
interface WorkoutRecord {
  date: string;
  duration: number;
  youtubeUrl: string;
  mean: number;
  segments?: Segment[];
}
type DisplayRecord = WorkoutRecord & {
  id: string;
  name: string;
  age: number;
  height: number;
  weight: number;
  userId?: string;
};

/* 유튜브 썸네일 */
const extractYouTubeId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))
      return u.pathname.replace("/", "") || null;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return id;
      const m = u.pathname.match(/\/embed\/([^/?]+)/);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
};
const getThumb = (url: string) => {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

/* 레이아웃 상수 */
const CARD_ROW_H = 520; // 그리드 한 행(한 카드 셀) 높이

/* 카드형 컨테이너 */
const CardLikeBox: React.FC<
  React.PropsWithChildren & { onClick?: () => void }
> = ({ children, onClick }) => {
  const clickable = typeof onClick === "function";
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      onClick={onClick}
      className={cn(
        "h-full flex flex-col rounded-lg border bg-card p-4 text-left shadow-sm transition",
        clickable
          ? "cursor-pointer hover:-translate-y-[2px] hover:shadow-md"
          : "cursor-default"
      )}
    >
      {children}
    </div>
  );
};

/* 16:9 썸네일 – URL 없어도 고정 프레임 유지 */
const ThumbBox: React.FC<{ url?: string }> = ({ url }) => {
  const src = url ? getThumb(url) : null;
  return (
    <div className='rounded-lg border bg-muted/20 overflow-hidden'>
      <div className='relative w-full pt-[56.25%]'>
        {src && (
          <img
            src={src}
            alt='YouTube thumbnail'
            className='absolute inset-0 w-full h-full object-cover'
          />
        )}
      </div>
    </div>
  );
};

/* 유틸 */
const calcAgeFromBirth = (birth: string): number => {
  const b = dayjs(birth, "YYYY-MM-DD", true);
  if (!b.isValid()) return 0;
  const today = dayjs();
  let age = today.year() - b.year();
  const before =
    today.month() < b.month() ||
    (today.month() === b.month() && today.date() < b.date());
  if (before) age -= 1;
  return age;
};

const adaptResponseToDisplay = (raw: any[]): DisplayRecord[] =>
  (raw ?? []).map((rec: any) => {
    const user = rec?.user ?? {};
    const segments: Segment[] | undefined = Array.isArray(rec?.timelines)
      ? rec.timelines.map((t: any) => ({
          startSec: Number(t?.youtube_start_sec ?? 0),
          endSec: Number(t?.youtube_end_sec ?? 0),
          pose: String(t?.pose ?? ""),
          mean: Number(t?.score ?? 0),
        }))
      : undefined;
    return {
      id: String(rec?.id ?? ""),
      name: String(user?.nickname ?? ""),
      age: calcAgeFromBirth(user?.birth ?? ""),
      height: Number(user?.height ?? 0),
      weight: Number(user?.weight ?? 0),
      userId: String(user?.id ?? ""),
      date: String(rec?.dateTime ?? "").split("T")[0] || "",
      duration: Number(rec?.workingout_time ?? 0), // 필요 시 초/분 단위 통일
      youtubeUrl: String(rec?.youtube_url ?? ""),
      mean: Number(rec?.total_score ?? 0),
      segments,
    };
  });

const formatHMS = (sec: number) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = s % 60;
  if (h > 0) return `${h}시간 ${m}분 ${ss}초`;
  if (m > 0) return `${m}분 ${ss}초`;
  return `${ss}초`;
};

/* ── 메인 ── */
export default function RecordPage() {
  return (
    <Suspense fallback={<div>기록을 불러오는 중...</div>}>
      <WorkoutDashboard />
    </Suspense>
  );
}

const WorkoutDashboard: React.FC = () => {
  const router = useRouter();
  const sp = useSearchParams();
  const openId = sp.get("openId") ?? "";
  const hasOpenedRef = useRef(false);

  const [allRecords, setAllRecords] = useState<DisplayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [uiDuration, setUiDuration] = useState<[number, number]>([0, 999]);
  const [uiMean, setUiMean] = useState<[number, number]>([0, 100]);
  const [uiStartDate, setUiStartDate] = useState<Dayjs | null>(null);
  const [uiEndDate, setUiEndDate] = useState<Dayjs | null>(null);

  const [duration, setDuration] = useState<[number, number]>([0, 999]);
  const [mean, setMean] = useState<[number, number]>([0, 100]);
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8; // 2행×4열

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/record");
        const msg = Array.isArray(res?.data?.message) ? res.data.message : [];
        setAllRecords(adaptResponseToDisplay(msg));
      } catch (e) {
        console.error("Failed to fetch /api/record:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ openId가 있으면 목록 로드 완료 후 자동 상세 진입
  useEffect(() => {
    if (!openId || hasOpenedRef.current || loading) return;

    const target = allRecords.find((r) => String(r.id) === String(openId));
    if (!target) return; // 아직 목록에 해당 항목이 반영되지 않았으면 다음 렌더에서 재시도

    hasOpenedRef.current = true;

    // URL에서 openId 제거 (뒤로가기 시 재자동 이동 방지)
    const params = new URLSearchParams(sp.toString());
    params.delete("openId");
    const cleaned = params.toString()
      ? `/record?${params.toString()}`
      : `/record`;
    router.replace(cleaned);

    // 목록에서 클릭한 것과 동일하게 상세로 이동
    gotoDetail(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, allRecords, loading, router, sp]);

  const applyFilters = () => {
    setLoading(true);
    setTimeout(() => {
      setDuration(uiDuration);
      setMean(uiMean);
      if (uiStartDate && uiEndDate) {
        const [s, e] = uiEndDate.isBefore(uiStartDate)
          ? [uiEndDate, uiStartDate]
          : [uiStartDate, uiEndDate];
        setDateRange([s.format("YYYY-MM-DD"), e.format("YYYY-MM-DD")]);
      } else setDateRange([null, null]);
      setCurrentPage(1);
      setLoading(false);
    }, 120);
  };

  const parseYMD = (d: string) => dayjs(d, "YYYY-MM-DD", true);
  const inRange = (d: string) => {
    const [s, e] = dateRange;
    if (!s || !e) return true;
    const cur = parseYMD(d);
    return (
      cur.isValid() && cur.isBetween(parseYMD(s), parseYMD(e), "day", "[]")
    );
  };

  const filtered = useMemo(
    () =>
      allRecords.filter(
        (r) =>
          r.duration >= duration[0] &&
          r.duration <= duration[1] &&
          r.mean >= mean[0] &&
          r.mean <= mean[1] &&
          inRange(r.date)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRecords, duration, mean, dateRange]
  );

  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = useMemo(
    () => filtered.slice(startIdx, startIdx + pageSize),
    [filtered, startIdx]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const gotoDetail = (r: DisplayRecord) => {
    const q = new URLSearchParams({
      id: r.id,
      userId: r.userId || "",
      name: r.name,
      age: String(r.age),
      height: String(r.height),
      weight: String(r.weight),
      date: r.date,
      duration: String(r.duration),
      youtubeUrl: r.youtubeUrl,
      mean: String(r.mean),
      current: "0",
    });
    if (r.segments?.length) q.set("segments", JSON.stringify(r.segments));
    router.push(`/record/detail?${q.toString()}`);
  };

  /* 사이드바 */
  const FilterSidebar = (
    <div className='p-4'>
      <div className='flex items-center justify-end mb-2'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => setCollapsed((v) => !v)}
        >
          <Menu className='h-5 w-5' />
        </Button>
      </div>

      <div className='mx-auto w-full' style={{ maxWidth: 320 }}>
        {!collapsed && (
          <Button
            onClick={applyFilters}
            className='w-full h-10 font-extrabold tracking-tight mb-4 bg-[#0f2552] text-white hover:bg-[#0b1c40]'
          >
            필터 적용
          </Button>
        )}

        {!collapsed && (
          <>
            <Card className='w-full mb-3'>
              <CardHeader className='py-3'>
                <CardTitle className='text-base font-bold text-center'>
                  운동시간 (분)
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-0 pb-4'>
                <Slider
                  value={uiDuration}
                  min={0}
                  max={999}
                  step={1}
                  onValueChange={(v) => setUiDuration([v[0] ?? 0, v[1] ?? 0])}
                />
                <div className='text-center text-sm text-muted-foreground mt-2'>
                  {uiDuration[0]}분 ~ {uiDuration[1]}분
                </div>
              </CardContent>
            </Card>

            <Card className='w-full mb-3'>
              <CardHeader className='py-3'>
                <CardTitle className='text-base font-bold text-center'>
                  유사도 평균 (%)
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-0 pb-4'>
                <Slider
                  value={uiMean}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => setUiMean([v[0] ?? 0, v[1] ?? 0])}
                />
                <div className='text-center text-sm text-muted-foreground mt-2'>
                  {uiMean[0]}% ~ {uiMean[1]}%
                </div>
              </CardContent>
            </Card>

            <Card className='w-full mb-3'>
              <CardHeader className='py-3'>
                <CardTitle className='text-base font-bold text-center'>
                  날짜
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-0 pb-4'>
                <div className='grid gap-2'>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant='outline' className='justify-start'>
                        <CalendarIcon className='mr-2 h-4 w-4' />
                        {uiStartDate
                          ? uiStartDate.format("YYYY-MM-DD")
                          : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='p-0' align='start'>
                      <Calendar
                        mode='single'
                        selected={uiStartDate?.toDate()}
                        onSelect={(d) => setUiStartDate(d ? dayjs(d) : null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant='outline' className='justify-start'>
                        <CalendarIcon className='mr-2 h-4 w-4' />
                        {uiEndDate
                          ? uiEndDate.format("YYYY-MM-DD")
                          : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='p-0' align='start'>
                      <Calendar
                        mode='single'
                        selected={uiEndDate?.toDate()}
                        onSelect={(d) => setUiEndDate(d ? dayjs(d) : null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className='text-center text-sm text-muted-foreground mt-2'>
                  {uiStartDate && uiEndDate
                    ? `${uiStartDate.format("YYYY-MM-DD")} ~ ${uiEndDate.format(
                        "YYYY-MM-DD"
                      )}`
                    : "전체 기간"}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );

  /* 레이아웃 */
  const gridCols = collapsed
    ? "grid-cols-[56px_minmax(0,1fr)]"
    : "grid-cols-[clamp(56px,20vw,300px)_minmax(0,1fr)]";

  return (
    <div className='w-full'>
      <div className={`grid w-full ${gridCols} gap-0`}>
        {/* 사이드바 */}
        <aside
          className='border-r bg-white'
          style={{
            position: "sticky",
            top: 0,
            alignSelf: "start",
            maxHeight: "100svh",
            overflowY: "auto",
          }}
        >
          {FilterSidebar}
        </aside>

        {/* 메인 */}
        <main className='relative bg-muted/30 px-4 sm:px-6 lg:px-8 py-6'>
          {loading && (
            <div className='fixed inset-0 z-10 flex items-center justify-center bg-background/50'>
              <div className='flex items-center gap-2 rounded-md border bg-background px-4 py-2 shadow-sm'>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span className='text-sm'>불러오는 중...</span>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className='min-h-[40svh] flex items-center justify-center'>
              <Card className='w-full max-w-md'>
                <CardHeader>
                  <CardTitle>조건에 맞는 기록이 없습니다</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground'>
                    필터를 조정하거나 기간을 넓혀보세요.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* 4열 + 행 높이 고정 */}
              <div
                className={`grid grid-cols-4 gap-4 [grid-auto-rows:${CARD_ROW_H}px]`}
              >
                {pageItems.map((r) => (
                  <div key={r.id} className='h-full'>
                    <CardLikeBox onClick={() => gotoDetail(r)}>
                      {/* 위 정보 영역 */}
                      <div className='flex flex-col gap-3 min-h-[140px] md:min-h-[160px] xl:min-h-[180px]'>
                        <div>
                          <div className='text-[17px] font-semibold mb-2'>
                            운동 정보
                          </div>

                          <div className='flex flex-col items-start gap-2'>
                            <Badge
                              variant='secondary'
                              className='w-fit rounded-full px-3 py-1 text-[14px] whitespace-nowrap'
                            >
                              <span className='opacity-75 font-semibold mr-2'>
                                날짜 :
                              </span>
                              {r.date}
                            </Badge>
                            <Badge
                              variant='secondary'
                              className='w-fit rounded-full px-3 py-1 text-[14px] whitespace-nowrap'
                            >
                              <span className='opacity-75 font-semibold mr-2'>
                                운동시간 :
                              </span>
                              {Number.isFinite(Number(r.duration))
                                ? formatHMS(Number(r.duration))
                                : "-"}
                            </Badge>
                          </div>
                        </div>

                        <div className='border-t pt-3'>
                          <div className='text-[17px] font-semibold mb-2'>
                            기록 정보
                          </div>
                          <div className='flex flex-wrap gap-2.5'>
                            <Badge
                              variant='outline'
                              className='rounded-full px-3 py-1 text-[14px] whitespace-nowrap'
                            >
                              <span className='opacity-75 font-semibold mr-2'>
                                유사도 평균 :
                              </span>
                              {r.mean.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* 썸네일 */}
                      <div className='mt-auto pt-3'>
                        <ThumbBox url={r.youtubeUrl} />
                      </div>

                      <div className='flex-1' />
                    </CardLikeBox>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              <div className='flex items-center justify-center gap-2 mt-4'>
                <Button
                  variant='outline'
                  size='icon'
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className='h-4 w-4' />
                </Button>
                <div className='text-sm text-muted-foreground select-none'>
                  Page{" "}
                  <span className='font-semibold text-foreground'>
                    {currentPage}
                  </span>{" "}
                  / {totalPages}
                </div>
                <Button
                  variant='outline'
                  size='icon'
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
