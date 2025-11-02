"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Card,
  Typography,
  Button,
  Slider,
  Empty,
  Spin,
  Tag,
  DatePicker,
  Pagination,
  message,
} from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

dayjs.extend(isBetween);

const { Sider, Content } = Layout;
const { Text } = Typography;

/* ───────────────────────── 타입 ───────────────────────── */
interface Segment {
  startSec: number;
  endSec: number;
  pose: string;
  mean: number;
}
interface WorkoutRecord {
  date: string; // "YYYY-MM-DD"
  duration: number;
  youtubeUrl: string;
  mean: number;
  segments?: Segment[];
}
interface User {
  id: string;
  name: string;
  age: number;
  height: number;
  weight: number;
  records: WorkoutRecord[];
}
type DisplayRecord = WorkoutRecord & {
  id: string;
  name: string;
  age: number;
  height: number;
  weight: number;
  userId?: string;
};

/* ─────────────────────── 스타일 ─────────────────────── */
/** 상단 네비게이션(헤더) 높이. 실제 높이에 맞게 조정하세요. */
const HEADER_H = 64;

/** 페이지 루트를 헤더 아래에 고정시켜 부모 스크롤을 제거 */
const layoutStyle: React.CSSProperties = {
  position: "fixed",
  top: HEADER_H, // 헤더 바로 아래부터
  left: 0,
  right: 0,
  bottom: 0, // 뷰포트 하단까지
  height: `calc(100dvh - ${HEADER_H}px)`,
  background: "#f5f5f5",
  overflow: "hidden", // 부모 스크롤 제거
};

const innerLayoutStyle: React.CSSProperties = {
  height: "100%", // 자식 레이아웃이 꽉 차도록
  minHeight: 0,
  background: "#f5f5f5",
  overflow: "hidden", // 자식도 넘치지 않게
};

const siderStyle: React.CSSProperties = {
  background: "#fff",
  padding: 16,
  height: "100%",
  overflowY: "auto", // 사이드바 내용이 넘치면 여기서만 스크롤
};

const contentStyle: React.CSSProperties = {
  padding: 24,
  background: "#f5f5f5",
  overflowY: "auto", // 본문 스크롤은 여기 하나만
  minHeight: 0,
  height: "100%",
};

const cardChrome: React.CSSProperties = {
  borderRadius: 8,
  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
};
const buttonChrome: React.CSSProperties = {
  ...cardChrome,
  width: "100%",
  textAlign: "left",
  background: "#fff",
  border: "1px solid #eee",
  padding: 16,
  height: "100%",
  whiteSpace: "normal",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  transition:
    "box-shadow .25s ease, transform .25s ease, border-color .25s ease",
};
const buttonHover: React.CSSProperties = {
  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
  transform: "translateY(-3px)",
  borderColor: "#e2e2e2",
};
const SECTION_TITLE_FS = 17;
const TAG_FS = 14;
const LABEL_FS = 14;
const pill: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 12px",
  fontSize: TAG_FS,
  lineHeight: "22px",
  border: "none",
};
const labelCss: React.CSSProperties = {
  opacity: 0.75,
  marginRight: 8,
  fontWeight: 600,
  fontSize: LABEL_FS,
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

/* 공통 섹션 */
type SectionProps = React.PropsWithChildren<{ title: string; first?: boolean }>;
const Section = ({ title, first, children }: SectionProps) => (
  <div
    style={
      first
        ? {}
        : { borderTop: "1px solid #eee", marginTop: 12, paddingTop: 12 }
    }
  >
    <Text strong style={{ fontSize: SECTION_TITLE_FS }}>
      {title}
    </Text>
    <div style={{ marginTop: 10 }}>{children}</div>
  </div>
);

/* 16:9 썸네일 */
const ThumbBox = ({ url }: { url: string }) => {
  const src = getThumb(url);
  if (!src) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label="유튜브 영상 보기"
      style={{ display: "block", textDecoration: "none" }}
    >
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          background: "#fafafa",
          overflow: "hidden",
        }}
      >
        <div
          style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}
        >
          <img
            src={src}
            alt="YouTube thumbnail"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      </div>
    </a>
  );
};

/* 카드형 컨테이너 */
const CardLikeBox: React.FC<
  React.PropsWithChildren & { onClick?: () => void }
> = ({ children, onClick }) => {
  const [hover, setHover] = useState(false);
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
      style={{
        ...buttonChrome,
        ...(hover ? buttonHover : {}),
        cursor: clickable ? "pointer" : "default",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </div>
  );
};

/* ───────────────────── 유틸 (나이 계산 & 어댑터) ───────────────────── */
const calcAgeFromBirth = (birth: string): number => {
  const b = dayjs(birth, "YYYY-MM-DD", true);
  if (!b.isValid()) return 0;
  const today = dayjs();
  let age = today.year() - b.year();
  const beforeBirthday =
    today.month() < b.month() ||
    (today.month() === b.month() && today.date() < b.date());
  if (beforeBirthday) age -= 1;
  return age;
};

/** Swagger 응답 → 기존 타입으로 맵핑 */
const adaptResponseToDisplay = (raw: any[]): DisplayRecord[] => {
  const out: DisplayRecord[] = [];
  raw.forEach((rec: any) => {
    const user = rec?.user ?? {};
    const name: string = user?.nickname ?? "";
    const age: number = calcAgeFromBirth(user?.birth ?? "");
    const height: number = Number(user?.height ?? 0);
    const weight: number = Number(user?.weight ?? 0);

    const segments: Segment[] | undefined = Array.isArray(rec?.timelines)
      ? rec.timelines.map((t: any) => ({
          startSec: Number(t?.youtube_start_sec ?? 0),
          endSec: Number(t?.youtube_end_sec ?? 0),
          pose: String(t?.pose ?? ""),
          mean: Number(t?.score ?? 0),
        }))
      : undefined;

    const display: DisplayRecord = {
      id: String(rec?.id ?? ""),
      name,
      age,
      height,
      weight,
      userId: String(user?.id ?? ""),
      date: String(rec?.dateTime ?? "").split("T")[0] || "",
      duration: Number(rec?.workingout_time ?? 0),
      youtubeUrl: String(rec?.youtube_url ?? ""),
      mean: Number(rec?.total_score ?? 0),
      segments,
    };
    out.push(display);
  });
  return out;
};

/* ───────────────────── 메인 컴포넌트 ───────────────────── */
const WorkoutDashboard: React.FC = () => {
  const router = useRouter();

  // 전체 원본 목록(서버에서 1회 전체 가져옴)
  const [allRecords, setAllRecords] = useState<DisplayRecord[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  // 필터 UI 상태
  const [uiDuration, setUiDuration] = useState<[number, number]>([0, 999]);
  const [uiMean, setUiMean] = useState<[number, number]>([0, 100]);
  const [uiStartDate, setUiStartDate] = useState<Dayjs | null>(null);
  const [uiEndDate, setUiEndDate] = useState<Dayjs | null>(null);

  // 실제 적용값
  const [duration, setDuration] = useState<[number, number]>([0, 999]);
  const [mean, setMean] = useState<[number, number]>([0, 100]);
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  // 페이지네이션(프론트 전담)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // ✅ 전체 데이터 1회 로드 (params 없이)
  const fetchAllRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/record");
      const msg = Array.isArray(res?.data?.message) ? res.data.message : [];
      const adapted = adaptResponseToDisplay(msg);
      setAllRecords(adapted);
    } catch (e) {
      console.error("Failed to fetch /api/record:", e);
      message.error("운동 기록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRecords();
  }, []);

  // 필터 적용
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
      } else {
        setDateRange([null, null]);
      }
      setCurrentPage(1);
      setLoading(false);
    }, 150);
  };

  const parseYMD = (d: string) => dayjs(d, "YYYY-MM-DD", true);
  const isInDateRange = (d: string) => {
    const [start, end] = dateRange;
    if (!start || !end) return true;
    const cur = parseYMD(d);
    return (
      cur.isValid() &&
      cur.isBetween(parseYMD(start), parseYMD(end), "day", "[]")
    );
  };

  // 필터링된 전체 목록
  const filtered = useMemo(
    () =>
      allRecords.filter(
        (r) =>
          r.duration >= duration[0] &&
          r.duration <= duration[1] &&
          r.mean >= mean[0] &&
          r.mean <= mean[1] &&
          isInDateRange(r.date)
      ),
    [allRecords, duration, mean, dateRange]
  );

  // 현재 페이지에 보여줄 슬라이스
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = useMemo(
    () => filtered.slice(startIdx, endIdx),
    [filtered, startIdx, endIdx]
  );

  const formatHMS = (sec: number) => {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}시간 ${m}분 ${ss}초`;
    if (m > 0) return `${m}분 ${ss}초`;
    return `${ss}초`;
  };

  // 상세 이동
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
    if (r.segments && r.segments.length > 0) {
      q.set("segments", JSON.stringify(r.segments));
    }
    router.push(`/record/detail?${q.toString()}`);
  };

  const renderButtonCard = (r: DisplayRecord) => (
    <CardLikeBox key={r.id} onClick={() => gotoDetail(r)}>
      <Section title="운동 정보" first>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Tag style={{ ...pill, background: "#FFF1E6" }}>
            <span style={labelCss}>날짜 : </span> {r.date}
          </Tag>
          <Tag style={{ ...pill, background: "#FFEFEF" }}>
            <span style={labelCss}>운동시간 : </span>
            {Number.isFinite(Number(r.duration))
              ? formatHMS(Number(r.duration))
              : "-"}
          </Tag>
        </div>
      </Section>

      <Section title="기록 정보">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Tag style={{ ...pill, background: "#E9FFF3" }}>
            <span style={{ ...labelCss }}>유사도 평균 : </span>{" "}
            {r.mean.toFixed(1)}%
          </Tag>
        </div>
      </Section>

      <ThumbBox url={r.youtubeUrl} />
    </CardLikeBox>
  );

  return (
    <Layout style={layoutStyle}>
      {/* 왼쪽: 필터 사이드바 */}
      <Sider
        width={300}
        collapsible
        collapsed={collapsed}
        trigger={null}
        style={siderStyle}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 8,
          }}
        >
          {React.createElement(
            collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
            {
              onClick: () => setCollapsed((v) => !v),
              style: { fontSize: 20, cursor: "pointer" },
            }
          )}
        </div>

        {!collapsed && (
          <Button
            onClick={applyFilters}
            style={{
              width: "100%",
              background: "#003366",
              color: "#fff",
              border: "none",
              height: 38,
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: 0.2,
              marginBottom: 16,
              marginTop: 10,
            }}
          >
            필터 적용
          </Button>
        )}

        {!collapsed && (
          <>
            <Card
              size="small"
              title="운동시간 (분)"
              style={{ ...cardChrome, marginBottom: 12, textAlign: "center" }}
              headStyle={{
                padding: "12px 16px",
                fontSize: 16,
                fontWeight: 700,
              }}
              bodyStyle={{ padding: 16, fontSize: 15 }}
            >
              <Slider
                range
                min={0}
                max={999}
                value={uiDuration}
                onChange={(v) => setUiDuration(v as [number, number])}
              />
              <div style={{ textAlign: "center", color: "#555", fontSize: 15 }}>
                {uiDuration[0]}분 ~ {uiDuration[1]}분
              </div>
            </Card>

            <Card
              size="small"
              title="유사도 평균 (%)"
              style={{ ...cardChrome, marginBottom: 12, textAlign: "center" }}
              headStyle={{
                padding: "12px 16px",
                fontSize: 16,
                fontWeight: 700,
              }}
              bodyStyle={{ padding: 16, fontSize: 15 }}
            >
              <Slider
                range
                min={0}
                max={100}
                value={uiMean}
                onChange={(v) => setUiMean(v as [number, number])}
              />
              <div style={{ textAlign: "center", color: "#555", fontSize: 15 }}>
                {uiMean[0]}% ~ {uiMean[1]}%
              </div>
            </Card>

            <Card
              size="small"
              title="날짜"
              style={{ ...cardChrome, marginBottom: 12, textAlign: "center" }}
              headStyle={{
                padding: "12px 16px",
                fontSize: 16,
                fontWeight: 700,
              }}
              bodyStyle={{ padding: 16, fontSize: 15 }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <DatePicker
                  placeholder="Start date"
                  onChange={(val) => setUiStartDate(val)}
                  style={{ width: "100%" }}
                  allowClear
                />
                <DatePicker
                  placeholder="End date"
                  onChange={(val) => setUiEndDate(val)}
                  style={{ width: "100%" }}
                  allowClear
                />
              </div>
              <div
                style={{
                  textAlign: "center",
                  color: "#555",
                  fontSize: 15,
                  marginTop: 8,
                }}
              >
                {uiStartDate && uiEndDate
                  ? `${uiStartDate.format("YYYY-MM-DD")} ~ ${uiEndDate.format(
                      "YYYY-MM-DD"
                    )}`
                  : "전체 기간"}
              </div>
            </Card>
          </>
        )}
      </Sider>

      {/* 오른쪽: 그리드 + 페이지네이션 */}
      <Layout style={innerLayoutStyle}>
        <Content style={contentStyle}>
          <Spin spinning={loading}>
            {filtered.length === 0 ? (
              <div
                style={{
                  height: "60vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Empty description="조건에 맞는 기록이 없습니다" />
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 16,
                    alignItems: "stretch",
                  }}
                >
                  {pageItems.map((r) => (
                    <div key={r.id} style={{ height: "100%" }}>
                      {renderButtonCard(r)}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 16,
                  }}
                >
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filtered.length}
                    showSizeChanger={false}
                    onChange={(page) => setCurrentPage(page)}
                  />
                </div>
              </>
            )}
          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
};

export default WorkoutDashboard;
