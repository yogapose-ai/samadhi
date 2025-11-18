"use client";

import React, { useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User as UserIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  LineChart as LineChartIcon,
  ChevronUp,
  ChevronDown,
  ExternalLink as ExternalLinkIcon,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Progress } from "@/components/ui";

/* ───────────── 스타일 토큰 ───────────── */
const SURFACE = "bg-white";
const BG = "bg-[#f5f7fb]";
const RADIUS = "rounded-2xl";
const SHADOW = "shadow-[0_10px_30px_rgba(16,24,40,0.06)]";
const G1 = "bg-[#5B86E5]"; // 기존 밝은 파란색 유지
// const G2 = "bg-[#5B86E5]";
const G3 = "bg-[#5B86E5]";

/* ───────────── 폰트 사이즈 프리셋 ───────────── */
const FS = {
  cardHeader: "text-[18px]",
  gridLabel: "text-[18px]",
  gridValue: "text-[20px]",
  title: "text-[clamp(24px,2.6vw,34px)]",
  tag: "text-[16px]",
  pose: "text-[clamp(32px,4vw,56px)]",
};

/* 시간 포맷 */
const formatHMS = (sec: number) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}시간 ${m}분 ${ss}초`;
  if (m > 0) return `${m}분 ${ss}초`;
  return `${ss}초`;
};
const toMMSS = (sec: number) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

/* 타입 */
type Segment = { startSec: number; endSec: number; pose: string; mean: number };

/* 공용 카드 */
function UniformCard({
  title,
  icon,
  gradient = G1,
  minH = 168,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  gradient?: string;
  minH?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${SURFACE} ${RADIUS} ${SHADOW} overflow-hidden flex flex-col`}
      style={{ minHeight: minH }}
    >
      <div
        className={`${gradient} text-white px-4 py-3 flex items-center gap-3`}
      >
        <span className='w-[30px] h-[30px] rounded-full bg-white/25 inline-flex items-center justify-center text-[20px]'>
          {icon}
        </span>
        <span className={`font-extrabold ${FS.cardHeader}`}>{title}</span>
      </div>

      <div className='p-4 flex-1 flex flex-col justify-center gap-2'>
        {children}
      </div>
    </div>
  );
}

/* 라벨-값 그리드 (행 정렬 및 균등 간격) */
function InfoGrid({
  data,
  cols = "clamp(110px, 24vw, 160px) 1fr",
}: {
  data: Record<string, React.ReactNode>;
  cols?: string;
}) {
  return (
    <div
      className='grid gap-x-4 gap-y-5 items-center max-w-full'
      style={{ gridTemplateColumns: cols }}
    >
      {Object.entries(data).map(([k, v]) => (
        <React.Fragment key={k}>
          <div
            className={`text-left font-extrabold text-[#2c2c2c] ${FS.gridLabel} flex items-center`}
          >
            {k}
          </div>
          <div
            className={`text-left text-[#475467] ${FS.gridValue} flex items-center`}
          >
            {v}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* 왼쪽 세션 요약 */
function BigPanel({
  seg,
  index,
  total,
  onPrev,
  onNext,
}: {
  seg: Segment | null;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const timeText = seg
    ? `영상 시간 : ${toMMSS(seg.startSec)} ~ ${toMMSS(seg.endSec)}`
    : "영상 시간 : 00:00 ~ 00:00";
  const avgText = seg ? `평균 점수 ${seg.mean.toFixed(1)}%` : "평균 점수 -";

  return (
    <div
      className={`${SURFACE} ${RADIUS} ${SHADOW} p-6 flex flex-col`}
      style={{ minHeight: "min(72vh, calc(100vh - 160px))", height: "100%" }}
    >
      <div className='text-center relative top-[25px] mb-4'>
        <div className='text-[26px] sm:text-[30px] font-extrabold text-[#111827]'>
          {timeText}
        </div>
        <div className='mt-1 text-[22px] sm:text-[24px] font-medium text-[#667085]'>
          {avgText}
        </div>
      </div>

      <div className='flex-1 flex flex-col items-center justify-center gap-3 pt-2'>
        <Button
          variant='ghost'
          size='icon'
          onClick={onPrev}
          disabled={index <= 0}
          aria-label='이전 구간(위)'
          className='rounded-full h-12 w-12 text-[18px]'
        >
          <ChevronUp className='h-6 w-6' />
        </Button>

        <div className='w-[min(92%,960px)] max-w-[960px] rounded-2xl bg-white border border-[#eef0f4] shadow-[0_16px_40px_rgba(16,24,40,0.07)] px-8 py-10'>
          <div
            className={`${FS.pose} font-black tracking-[0.2px] leading-tight text-center text-[#111827]`}
          >
            {seg ? seg.pose : "자세 이름"}
          </div>
        </div>

        <Button
          variant='ghost'
          size='icon'
          onClick={onNext}
          disabled={index >= total - 1}
          aria-label='다음 구간(아래)'
          className='rounded-full h-12 w-12 text-[18px]'
        >
          <ChevronDown className='h-6 w-6' />
        </Button>
      </div>

      <div className='text-center text-[20px] sm:text-[23px] text-[#98a2b3] font-extrabold tracking-wide'>
        {total > 0 ? `${index + 1} / ${total}` : "- / -"}
      </div>
    </div>
  );
}

/* ───────────── 페이지 ───────────── */
const RecordDetailClient: React.FC = () => {
  const sp = useSearchParams();
  const router = useRouter();

  const name = sp.get("name") ?? "";
  const age = sp.get("age") ?? "";
  const height = sp.get("height") ?? "";
  const weight = sp.get("weight") ?? "";
  const date = sp.get("date") ?? "";
  const duration = sp.get("duration") ?? "";
  const youtubeUrl = sp.get("youtubeUrl") ?? "";
  const mean = sp.get("mean") ?? "";
  const meanNum = Number.isFinite(Number(mean)) ? Number(mean) : undefined;

  const { segments, currentIdx } = useMemo(() => {
    let segs: Segment[] = [];
    let idx = 0;
    const raw = sp.get("segments");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          segs = parsed
            .map((s) => ({
              startSec: Number(s.startSec),
              endSec: Number(s.endSec),
              pose: String(s.pose ?? ""),
              mean: Number(s.mean),
            }))
            .filter(
              (s) =>
                Number.isFinite(s.startSec) &&
                Number.isFinite(s.endSec) &&
                s.pose.length > 0 &&
                Number.isFinite(s.mean)
            );
        }
      } catch {}
    }
    const c = sp.get("current");
    if (c && Number.isFinite(Number(c))) {
      idx = Math.min(Math.max(0, Number(c)), Math.max(0, segs.length - 1));
    }
    return { segments: segs, currentIdx: idx };
  }, [sp]);

  const sel = segments[currentIdx] ?? null;

  const updateIndex = useCallback(
    (nextIdx: number) => {
      const params = new URLSearchParams(sp.toString());
      params.set("current", String(nextIdx));
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, sp]
  );

  return (
    <div className={`${BG} min-h-screen py-[18px]`}>
      <div className='mx-auto px-[18px]'>
        {/* 헤더 */}
        <Card
          className={`w-full border-none ${RADIUS} ${SHADOW} ${SURFACE} mb-3.5`}
        >
          <CardContent className='p-5'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3.5'>
                <div
                  className={`w-[50px] h-[50px] ${RADIUS} ${G1} flex items-center justify-center text-white shadow-[0_8px_18px_rgba(91,134,229,0.35)]`}
                >
                  <UserIcon className='w-6 h-6' />
                </div>
                <div>
                  <h1 className={`m-0 font-black ${FS.title}`}>
                    {name || "운동 기록 상세"}
                  </h1>
                  {(age || height || weight) && (
                    <p className='m-0 text-[16px] text-muted-foreground'>
                      {age && `${age}세`} {height && `· ${height}cm`}{" "}
                      {weight && `· ${weight}kg`}
                    </p>
                  )}
                </div>
              </div>
              {date && (
                <Badge
                  className={`px-3 py-1.5 rounded-full font-extrabold ${FS.tag} flex items-center gap-1.5`}
                  variant='secondary'
                >
                  <CalendarIcon className='w-4 h-4' />
                  {date}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 본문 */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch'>
          {/* 왼쪽 */}
          <div className='lg:col-span-9'>
            <BigPanel
              seg={sel}
              index={currentIdx}
              total={segments.length}
              onPrev={() => currentIdx > 0 && updateIndex(currentIdx - 1)}
              onNext={() =>
                currentIdx < segments.length - 1 && updateIndex(currentIdx + 1)
              }
            />
          </div>

          {/* 오른쪽 */}
          <div className='lg:col-span-3'>
            <div className='grid gap-3 h-full'>
              <UniformCard
                title='기록 정보'
                icon={<LineChartIcon className='w-5 h-5' />}
                gradient={G3}
                minH={208}
              >
                <InfoGrid
                  data={{
                    "유사도 평균":
                      typeof meanNum === "number"
                        ? `${meanNum.toFixed(1)}%`
                        : "-",
                  }}
                />
                {typeof meanNum === "number" && (
                  <div className='mt-3'>
                    <Progress value={Number(meanNum.toFixed(1))} />
                  </div>
                )}
              </UniformCard>

              <UniformCard
                title='세션 정보'
                icon={<ClockIcon className='w-5 h-5' />}
                gradient={G1}
                minH={208}
              >
                <InfoGrid
                  data={{
                    날짜: date || "-",
                    운동시간: Number.isFinite(Number(duration))
                      ? formatHMS(Number(duration))
                      : "-",
                    "영상 URL": youtubeUrl ? (
                      <a
                        href={youtubeUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='flex items-center'
                      >
                        <Button className='h-8 px-3 text-[14px] font-bold text-white bg-[#3856B8] hover:bg-[#2E4AA5] focus-visible:ring-[#3856B8] translate-y-[1px]'>
                          <ExternalLinkIcon className='w-[16px] h-[16px] mr-1 translate-y-[-0.5px]' />
                          바로가기
                        </Button>
                      </a>
                    ) : (
                      "-"
                    ),
                  }}
                />
              </UniformCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordDetailClient;
