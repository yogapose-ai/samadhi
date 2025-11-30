"use client";

import { useState, useEffect } from "react";
import { JointAngles } from "@/types";
import {
  calculateAllAngles,
  vectorize,
} from "@/lib/mediapipe/angle-calculator";
import { calculateSimilarityWithAnglesAndVectorized } from "@/lib/mediapipe/similarity-calculator";
import { useMediaPipe } from "@/hooks/useMediaPipe";

interface ImageResult {
  imagePath: string;
  vectorized: number[];
  angles: JointAngles | null;
}

interface ComparisonResult {
  imagePath: string;
  vectorizedScore: number;
  angleScore: number;
  combinedScore: number;
  rank: number;
}

interface FolderResult {
  folderName: string;
  referenceImage: string;
  comparisons: ComparisonResult[];
}

const POSE_FOLDERS = [
  { name: "나무자세 (1)", reference: "나무자세.png" },
  { name: "여신자세 (1)", reference: "여신자세.png" },
  { name: "전사자세2 (1)", reference: "전사자세2.png" },
  { name: "측면확장자세 (1)", reference: "측면확장자세.png" },
  { name: "하이런지자세 (1)", reference: "하이런지자세.png" },
  { name: "나무자세 (2)", reference: "나무자세.png" },
  { name: "여신자세 (2)", reference: "여신자세.png" },
  { name: "전사자세2 (2)", reference: "전사자세2.png" },
  { name: "측면확장자세 (2)", reference: "측면확장자세.png" },
  { name: "하이런지자세 (2)", reference: "하이런지자세.png" },
];

export default function TestPage() {
  const {
    imageLandmarker,
    isInitialized,
    error: mediaPipeError,
  } = useMediaPipe();
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<FolderResult[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [groundTruth, setGroundTruth] = useState<Record<
    string,
    Record<string, number>
  > | null>(null);
  const [spearmanResults, setSpearmanResults] = useState<
    Record<
      string,
      {
        correlation: number;
        p_value: number;
      }
    >
  >({});

  // Ground Truth JSON 파일 로드
  useEffect(() => {
    async function loadGroundTruth() {
      try {
        const response = await fetch(
          "/dataset/pose_data/pose_rank_ground_truth.json"
        );
        const data = await response.json();
        setGroundTruth(data);
      } catch (err) {
        console.error("Failed to load ground truth:", err);
      }
    }
    loadGroundTruth();
  }, []);

  // 스피어만 상관계수 계산
  function calculateSpearmanCorrelation(
    x: number[],
    y: number[]
  ): { correlation: number; p_value: number } {
    const n = x.length;
    if (n !== y.length || n < 2) {
      return { correlation: 0, p_value: 1 };
    }

    // 순위 계산 (동점 처리 포함)
    const rankX = calculateRanks(x);
    const rankY = calculateRanks(y);

    // 피어슨 상관계수를 순위에 대해 계산 (스피어만 상관계수)
    const meanX = rankX.reduce((a, b) => a + b, 0) / n;
    const meanY = rankY.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = rankX[i] - meanX;
      const diffY = rankY[i] - meanY;
      numerator += diffX * diffY;
      sumSqX += diffX * diffX;
      sumSqY += diffY * diffY;
    }

    const denominator = Math.sqrt(sumSqX * sumSqY);
    if (denominator === 0) {
      return { correlation: 0, p_value: 1 };
    }

    const correlation = numerator / denominator;

    // P-value 근사 계산 (n이 작을 때는 정확하지 않을 수 있음)
    // t-test 사용
    const t =
      correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const p_value = 2 * (1 - tDistribution(Math.abs(t), n - 2));

    return {
      correlation: isNaN(correlation) ? 0 : correlation,
      p_value: isNaN(p_value) || p_value < 0 ? 1 : Math.min(p_value, 1),
    };
  }

  // 순위 계산 (동점 처리)
  function calculateRanks(values: number[]): number[] {
    const sorted = [...values].map((v, i) => ({ value: v, index: i }));
    sorted.sort((a, b) => a.value - b.value);

    const ranks = new Array(values.length);
    let currentRank = 1;

    for (let i = 0; i < sorted.length; i++) {
      let sum = currentRank;
      let count = 1;

      // 동점 찾기
      while (
        i + count < sorted.length &&
        sorted[i].value === sorted[i + count].value
      ) {
        sum += currentRank + count;
        count++;
      }

      const avgRank = sum / count;
      for (let j = 0; j < count; j++) {
        ranks[sorted[i + j].index] = avgRank;
      }

      i += count - 1;
      currentRank += count;
    }

    return ranks;
  }

  // t-분포 근사 (간단한 근사치)
  function tDistribution(t: number, df: number): number {
    // 간단한 근사: 정규분포로 근사 (df가 충분히 클 때)
    if (df > 30) {
      return normalCdf(t);
    }
    // 더 정확한 계산이 필요하면 더 복잡한 공식 사용
    // 여기서는 간단한 근사 사용
    return normalCdf(t);
  }

  // 정규분포 누적분포함수 근사
  function normalCdf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  // Ground Truth와 예측 결과 비교
  function calculateSpearmanForAll() {
    if (!groundTruth || results.length === 0) {
      alert("Ground Truth 데이터 또는 결과가 없습니다.");
      return;
    }

    const prediction = convertResultsToJson();
    const analysisResults: Record<
      string,
      { correlation: number; p_value: number }
    > = {};

    for (const [poseName, gtRanks] of Object.entries(groundTruth)) {
      if (!prediction[poseName]) {
        console.warn(`Warning: '${poseName}'에 대한 예측 데이터가 없습니다.`);
        continue;
      }

      const predRanks = prediction[poseName];

      // 공통된 사진 ID만 추출
      const commonIds = Object.keys(gtRanks).filter((id) =>
        predRanks.hasOwnProperty(id)
      );

      if (commonIds.length < 2) {
        console.warn(
          `Warning: '${poseName}'에 대해 매칭되는 사진 ID가 충분하지 않습니다.`
        );
        continue;
      }

      // 정렬된 ID 순서대로 순위 값 추출
      const sortedIds = commonIds.sort();
      const gtVector = sortedIds.map((id) => gtRanks[id]);
      const predVector = sortedIds.map((id) => predRanks[id]);

      // 스피어만 상관계수 계산
      const result = calculateSpearmanCorrelation(gtVector, predVector);
      analysisResults[poseName] = result;
    }

    setSpearmanResults(analysisResults);
  }

  // 이미지에서 포즈 추출
  async function extractPoseFromImage(
    imagePath: string
  ): Promise<ImageResult | null> {
    if (!imageLandmarker) return null;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imagePath;
      });

      // MediaPipe의 detect 메서드 사용 (IMAGE 모드)
      // HTMLImageElement를 직접 전달
      const results = (imageLandmarker as any).detect(img);

      if (!results.landmarks || results.landmarks.length === 0) {
        console.warn(`No pose detected in ${imagePath}`);
        return null;
      }

      const landmarks = results.landmarks[0];
      const worldLandmarks = results.worldLandmarks?.[0];

      const vectorized = vectorize(landmarks, img.height, img.width);

      let angles: JointAngles | null = null;
      if (worldLandmarks) {
        angles = calculateAllAngles(worldLandmarks, {}, () => {});
      }

      return {
        imagePath,
        vectorized,
        angles,
      };
    } catch (err) {
      console.error(`Error processing ${imagePath}:`, err);
      return null;
    }
  }

  // 결과를 JSON 형식으로 변환
  function convertResultsToJson(): Record<string, Record<string, number>> {
    const jsonData: Record<string, Record<string, number>> = {};

    for (const folderResult of results) {
      const folderData: Record<string, number> = {};

      for (const comp of folderResult.comparisons) {
        // 이미지 경로에서 파일명 추출 (예: "/dataset/pose_data/나무자세 (1)/pic_1.jpg" -> "pic_1")
        const fileName = comp.imagePath.split("/").pop() || "";
        const picName = fileName.replace(/\.[^/.]+$/, ""); // 확장자 제거

        if (picName) {
          folderData[picName] = comp.rank;
        }
      }

      jsonData[folderResult.folderName] = folderData;
    }

    return jsonData;
  }

  // JSON 파일 다운로드
  function downloadResultsAsJson() {
    if (results.length === 0) {
      alert("저장할 결과가 없습니다. 먼저 실험을 실행해주세요.");
      return;
    }

    const jsonData = convertResultsToJson();
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pose_rank_results.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 모든 폴더 처리
  async function processAllFolders() {
    if (!isInitialized || !imageLandmarker) {
      alert("MediaPipe가 아직 초기화되지 않았습니다.");
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setError(null);

    const allResults: FolderResult[] = [];

    try {
      for (const folder of POSE_FOLDERS) {
        setCurrentFolder(folder.name);
        console.log(`Processing ${folder.name}...`);

        // 기준 이미지 추출
        const referencePath = `/dataset/pose_data/${folder.reference}`;
        const defaultReferenceResult = await extractPoseFromImage(referencePath);

        if (!defaultReferenceResult) {
          console.warn(`Failed to extract pose from reference: ${folder.reference}`);
          continue;
        }
        let secondaryReferenceResult = null;
        if (folder.name === "하이런지자세 (1)") {
          // 확장자가 jpeg인지 png인지 확인 필요 (요청하신 대로 jpeg로 가정)
          const secondaryRefPath = `/dataset/pose_data/하이런지자세2.jpeg`; 
          try {
            secondaryReferenceResult = await extractPoseFromImage(secondaryRefPath);
            if(!secondaryReferenceResult) console.warn("Failed to load secondary reference");
          } catch (e) {
            console.warn("Error loading secondary reference", e);
          }
        }
        let lambda=1;
        if (folder.name === "여신자세 (1)" || folder.name === "여신자세 (2)") lambda=0.4;
        // 폴더 내 이미지들 추출
        const imageFiles: string[] = [];
        for (let i = 1; i <= 10; i++) {
          // 확장자 시도 (jpg, png, jpeg)
          const extensions = ["jpg", "png", "jpeg"];
          for (const ext of extensions) {
            const path = `/dataset/pose_data/${folder.name}/pic_${i}.${ext}`;
            // 실제로 파일이 존재하는지 확인하기 위해 fetch 시도
            try {
              const response = await fetch(path, { method: "HEAD" });
              if (response.ok) {
                imageFiles.push(path);
                break;
              }
            } catch {
              // 파일이 없으면 다음 확장자 시도
            }
          }
        }

        // 각 이미지와 비교
        const comparisons: ComparisonResult[] = [];

        for (const imagePath of imageFiles) {
          const imageResult = await extractPoseFromImage(imagePath);

          if (!imageResult) {
            console.warn(`Failed to extract pose from ${imagePath}`);
            continue;
          }

          let currentReference = defaultReferenceResult; // 기본값

          // 파일 경로에서 숫자 추출 (예: .../pic_5.jpg -> 5)
          const match = imagePath.match(/pic_(\d+)\./);
          const picNum = match ? parseInt(match[1], 10) : 0;

          // 하이런지자세 (1) 폴더이면서, 특정 번호(2, 7, 8, 9, 10)인 경우
          if (folder.name === "하이런지자세 (1)" && secondaryReferenceResult) {
            // Set B: 2, 7, 8, 9, 10 -> 하이런지자세2 사용
            if ([2, 7, 8, 9, 10].includes(picNum)) {
              currentReference = secondaryReferenceResult;
              // console.log(`Switched reference for ${imagePath} to 하이런지자세2`);
            } 
            // Set A: 1, 3, 4, 5, 6 -> 기본값(하이런지자세.png) 유지
          }
          
          // -------------------------------------------------------------
          // 유사도 계산 (선택된 currentReference 사용)
          // -------------------------------------------------------------
          // 인자가 추가된 calculateSimilarityWithAnglesAndVectorized 호출
          const similarity = calculateSimilarityWithAnglesAndVectorized(
            currentReference.vectorized, // 동적으로 선택된 기준 벡터
            imageResult.vectorized,
            currentReference.angles,     // 동적으로 선택된 기준 각도
            imageResult.angles,
            lambda
          );

          console.log(`Similarity for ${imagePath}:`, similarity);

          comparisons.push({
            imagePath,
            vectorizedScore: similarity.vectorizedScore,
            angleScore: similarity.angleScore,
            combinedScore: similarity.combinedScore,
            rank: 0, // 나중에 정렬 후 설정
          });
        }

        // combinedScore 기준으로 정렬
        comparisons.sort((a, b) => b.combinedScore - a.combinedScore);

        // 순위 설정
        comparisons.forEach((comp, index) => {
          comp.rank = index + 1;
        });

        allResults.push({
          folderName: folder.name,
          referenceImage: referencePath,
          comparisons,
        });
      }

      setResults(allResults);

      // 결과가 있으면 자동으로 스피어만 상관계수 계산
      if (allResults.length > 0 && groundTruth) {
        setTimeout(() => {
          const prediction = convertResultsToJson();
          const analysisResults: Record<
            string,
            { correlation: number; p_value: number }
          > = {};

          for (const [poseName, gtRanks] of Object.entries(groundTruth)) {
            if (!prediction[poseName]) {
              continue;
            }

            const predRanks = prediction[poseName];
            const commonIds = Object.keys(gtRanks).filter((id) =>
              predRanks.hasOwnProperty(id)
            );

            if (commonIds.length < 2) {
              continue;
            }

            const sortedIds = commonIds.sort();
            const gtVector = sortedIds.map((id) => gtRanks[id]);
            const predVector = sortedIds.map((id) => predRanks[id]);

            const result = calculateSpearmanCorrelation(gtVector, predVector);
            analysisResults[poseName] = result;
          }

          setSpearmanResults(analysisResults);
        }, 100);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "처리 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsProcessing(false);
      setCurrentFolder("");
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">포즈 유사도 실험 페이지</h1>

      {(error || mediaPipeError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error || mediaPipeError}
        </div>
      )}

      <div className="mb-6 flex gap-4">
        <button
          onClick={processAllFolders}
          disabled={!isInitialized || isProcessing}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isProcessing
            ? `처리 중... (${currentFolder})`
            : isInitialized
            ? "실험 시작"
            : "초기화 중..."}
        </button>
        {results.length > 0 && (
          <>
            <button
              onClick={downloadResultsAsJson}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              결과 JSON 저장
            </button>
            <button
              onClick={calculateSpearmanForAll}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              스피어만 상관계수 계산
            </button>
          </>
        )}
      </div>

      {/* 스피어만 상관계수 결과 표시 */}
      {Object.keys(spearmanResults).length > 0 && (
        <div className="mb-6 border rounded-lg p-6 bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">
            스피어만 상관계수 분석
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    포즈 이름
                  </th>
                  <th className="border border-gray-300 px-4 py-2">상관계수</th>
                  <th className="border border-gray-300 px-4 py-2">P-value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(spearmanResults).map(([poseName, result]) => (
                  <tr key={poseName} className="bg-white hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">
                      {poseName}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <span
                        className={
                          result.correlation > 0.7
                            ? "text-green-600 font-semibold"
                            : result.correlation > 0.5
                            ? "text-yellow-600"
                            : "text-red-600"
                        }
                      >
                        {result.correlation.toFixed(4)}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {result.p_value.toExponential(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200 font-semibold">
                  <td className="border border-gray-300 px-4 py-2">
                    전체 평균 상관계수
                  </td>
                  <td
                    colSpan={2}
                    className="border border-gray-300 px-4 py-2 text-center"
                  >
                    {(
                      Object.values(spearmanResults).reduce(
                        (sum, r) => sum + r.correlation,
                        0
                      ) / Object.keys(spearmanResults).length
                    ).toFixed(4)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-8">
          {results.map((folderResult) => (
            <div
              key={folderResult.folderName}
              className="border rounded-lg p-6"
            >
              <h2 className="text-2xl font-semibold mb-4">
                {folderResult.folderName}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                기준 이미지: {folderResult.referenceImage}
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2">순위</th>
                      <th className="border border-gray-300 px-4 py-2">
                        이미지
                      </th>
                      <th className="border border-gray-300 px-4 py-2">
                        Vectorized Score
                      </th>
                      <th className="border border-gray-300 px-4 py-2">
                        Angle Score
                      </th>
                      <th className="border border-gray-300 px-4 py-2">
                        Combined Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {folderResult.comparisons.map((comp, idx) => (
                      <tr
                        key={comp.imagePath}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {comp.rank}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={comp.imagePath}
                              alt={`Image ${comp.rank}`}
                              className="w-20 h-20 object-cover rounded"
                            />
                            <span className="text-sm text-gray-600">
                              {comp.imagePath.split("/").pop()}
                            </span>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {comp.vectorizedScore.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {comp.angleScore.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center font-semibold">
                          {comp.combinedScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
