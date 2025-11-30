import { JointAngles } from "@/types";
import { LANDMARK_INDICES } from "./angle-calculator";
import { ValueOf } from "next/dist/shared/lib/constants";

export interface CosAndEuc {
  cosine: number; // 코사인 유사도 (-1 ~ 1)
  cosineScore: number; // 코사인 점수 (0 ~ 100)
  diff: number; // 유클리드 거리
  normDiff: number; // 정규화된 유클리드 거리 (0 ~ 1)
  euclidScore: number; // 유클리드 점수 (0 ~ 100)
}

// 전체 관절 벡터에 대해 코사인 유사도 및 유클리드 거리 계산
export function calculateCosAndEucTotalJoint(
  P1: number[],
  P2: number[]
): CosAndEuc | null {
  const n = P1.length;
  if (n !== P2.length || n === 0) {
    return null;
  }

  // 내적과 노름
  let dot = 0;
  let sum1 = 0;
  let sum2 = 0;
  let diffSum = 0;
  let invisibleCount = 0; // 보이지 않는 landmark 개수
  const totalLandmarks = n / 3; // 전체 landmark 개수

  for (let i = 0; i < n; i += 3) {
    // LANDMARK_INDEICES에 없는 점들은 무시
    // if (
    //   !Object.values(LANDMARK_INDICES).includes(
    //     (i / 3) as ValueOf<typeof LANDMARK_INDICES>
    //   )
    // ) {
    //   continue;
    // }

    // 3개씩 묶어서 [x, y, z] 체크
    const isP1Visible = P1[i] !== 0 || P1[i + 1] !== 0 || P1[i + 2] !== 0;
    const isP2Visible = P2[i] !== 0 || P2[i + 1] !== 0 || P2[i + 2] !== 0;

    // 둘 중 하나라도 보이지 않으면 카운트
    if (!isP1Visible || !isP2Visible) {
      invisibleCount++;
      // 보이지 않는 점은 계산에서 제외 (0으로 처리)
      continue;
    }

    // 둘 다 보이는 경우만 계산
    for (let j = 0; j < 3; j++) {
      const a = P1[i + j];
      const b = P2[i + j];
      dot += a * b;
      sum1 += a * a;
      sum2 += b * b;
      const d = a - b;
      diffSum += d * d;
    }
  }

  const mag1 = Math.sqrt(sum1);
  const mag2 = Math.sqrt(sum2);

  if (mag1 === 0 || mag2 === 0) {
    return null;
  }

  // 1) 코사인 유사도 (클램프)
  let cosine = dot / (mag1 * mag2);
  if (cosine > 1) {
    cosine = 1;
  } else if (cosine < -1) {
    cosine = -1;
  }

  console.log("Cosine similarity:", cosine);

  // 2) 유클리드 거리 정규화
  const diff = Math.sqrt(diffSum);
  const normDiff = diff / (mag1 + mag2 + 1e-12);

  // 3) 페널티 적용: 보이지 않는 landmark 비율만큼 감점
  const visibilityRatio = (totalLandmarks - invisibleCount) / totalLandmarks;

  const cosineScore = ((cosine + 1) / 2) * 100 * visibilityRatio;
  const euclidScore = (1 - normDiff) * 100 * visibilityRatio;

  return {
    cosine: cosine,
    cosineScore: cosineScore,
    diff: diff,
    normDiff: normDiff,
    euclidScore: euclidScore,
  };
}

// 전체 관절 벡터에 대해 코사인 유사도 및 유클리드 거리 혼합 점수 계산
export function calculateCosAndEucMixedScore(
  cosAndEuc: CosAndEuc | null,
  lambda: number = 0.7
): number {
  if (!cosAndEuc) return 0;
  const { cosine, cosineScore, normDiff, euclidScore } = cosAndEuc;

  // 3) 혼합 - 람다 기본값 0.7 (cos 0.7:euc 0.3)
  if (lambda < 0 || lambda > 1) return 0;
  const mixed = lambda * cosineScore + (1 - lambda) * euclidScore;

  // 4) ε 허용 + 반올림
  const eps = 1e-4;
  let mixedScore = 0;
  if (1 - cosine < eps && normDiff < eps) {
    mixedScore = 100;
  } else {
    mixedScore = Math.max(0, Math.min(100, Math.round(mixed * 1000) / 1000));
  }

  return mixedScore;
}

// 전체 관절 벡터 유사도 계산 함수
export function calculateSimilarityWithVectorized(
  P1: number[],
  P2: number[],
  lambda: number = 0.7
): number {
  P1 = normalizeMirroredVectorized(P1);
  const result = calculateCosAndEucTotalJoint(P1, P2);
  return calculateCosAndEucMixedScore(result, lambda);
}

// 각 관절 각도 유사도 계산 함수
export function calculateSimilarityWithAngles(
  referenceAngles: JointAngles,
  userAngles: JointAngles,
  name: string
): number {
  const keys = Object.keys(referenceAngles) as (keyof JointAngles)[];
  const diffs: Partial<Record<keyof JointAngles, number>> = {};
  const similarities: Partial<Record<keyof JointAngles, number>> = {};

  // 점수 하락 기울기 배열
  const diffTans: Partial<Record<keyof JointAngles, number>> = {};

  // 점수 가중치합 배열
  const weights: Partial<Record<keyof JointAngles, number>> = {};
  for (const key of keys) {
    diffTans[key] = 1;
    weights[key] = 1;
  }
  weights.spine = 3; // spine 가중치 3배

  for (const key of keys) {
    const valA = referenceAngles[key];
    const valB = userAngles[key];

    // 단순 각도 차이 계산 (절대값, 0~180 범위로 매핑)
    const angleDiff = Math.abs(valA - valB);

    // 각도 차이를 코사인 유사도로 변환
    // 값이 라디안이 아니라 도 단위라고 가정 (valA, valB는 degree)
    // const radA = (valA * Math.PI) / 180;
    // const radB = (valB * Math.PI) / 180;
    // const cosSim = Math.cos(radA - radB); // -1 ~ 1 (같으면 1, 180도 차이면 -1)
    // // 코사인 유사도(cosSim)를 0~1 사이(1에 가까울수록 더 유사)로 변환
    // const similarity = (cosSim + 1) / 2; // cosSim이 1이면 1, -1이면 0

    // if (key === "spine") {
    //   console.log("Angle comparison for spine:", valA, valB);
    //   console.log("and spine Cosine similarity:", similarity);
    // }

    diffs[key] = angleDiff;
  }

  let sum = 0;
  // 무릎이 90도 근처일 때 KNEE, HIP, ANKLE 가중치 조정
  if (referenceAngles.leftKnee < 110 && referenceAngles.leftKnee > 80) {
    if (referenceAngles.leftKnee + 10 < userAngles.leftKnee) {
      diffTans.leftKnee = 0.7; // 패널티 감소
      diffTans.leftHip = 0.7;
      diffTans.leftAnkle = 0.7;
    } else {
      diffTans.leftAnkle = 1.5;
    }
  }
  if (referenceAngles.rightKnee < 110 && referenceAngles.rightKnee > 80) {
    if (referenceAngles.rightKnee + 10 < userAngles.rightKnee) {
      diffTans.rightKnee = 0.7; // 패널티 감소
      diffTans.rightHip = 0.7;
      diffTans.rightAnkle = 0.7;
    } else {
      diffTans.rightAnkle = 1.5;
    }
  }

  // 팔꿈치 각도가 30도 이하로 구부러진 경우 가중치 조정
  if (referenceAngles.leftElbow < 100) {
    diffTans.leftElbow = 0.5; // 패널티 감소
    diffTans.leftWrist = 0.5;
  } else if (referenceAngles.leftElbow > 130) {
    weights.leftShoulder = 0;
  }
  if (referenceAngles.rightElbow < 100) {
    diffTans.rightElbow = 0.5; // 패널티 감소
    diffTans.rightWrist = 0.5;
  } else if (referenceAngles.rightElbow > 130) {
    weights.rightShoulder = 0;
  }
  diffTans.spine = 2;
  diffTans.leftHipShoulderAlign = 2;
  diffTans.rightHipShoulderAlign = 2;

  console.log(referenceAngles.leftKnee, userAngles.leftKnee, diffTans.leftKnee);
  console.log(
    referenceAngles.rightKnee,
    userAngles.rightKnee,
    diffTans.rightKnee
  );
  console.log("Weights applied for angles:", diffTans);
  for (const key of keys) {
    let angleDiff = diffs[key] || 0;
    const tan = diffTans[key] || 1;
    const weight = weights[key] || 1;
    // 각도 차이를 0~1로 정규화 (0~180)
    if (key === "spine") {
      console.log(
        "Raw angle diff for spine:",
        referenceAngles[key],
        userAngles[key],
        angleDiff
      );
    }
    const normDiff = Math.min((angleDiff * tan) / 180, 1);
    const similarity = 1 - normDiff; // 유사도 (1에 가까울수록 더 유사)

    similarities[key] = similarity;
    sum += similarity * weight;
  }
  const totalWeight = keys.reduce((acc, key) => acc + (weights[key] || 1), 0);
  const avgSimilarity = sum / totalWeight;
  //   if (name == "cat" || name == "cow") {
  console.log(
    "Angle similarities for pose",
    //   name,
    avgSimilarity * 100,
    similarities
  );
  //   }
  // 0~100으로 scaling
  return avgSimilarity * 100;
}

// 주어진 vectorized에서 특정 팔다리 벡터 추출 함수
function getLimbVector(
  vectorized: number[],
  index1: keyof typeof LANDMARK_INDICES,
  index2: keyof typeof LANDMARK_INDICES
) {
  // LANDMARK_INDICES로 인덱스 찾기

  const idx1 = LANDMARK_INDICES[index1] * 3;
  const idx2 = LANDMARK_INDICES[index2] * 3;

  const vec1 = {
    x: vectorized[idx1],
    y: vectorized[idx1 + 1],
    z: vectorized[idx1 + 2],
  };
  const vec2 = {
    x: vectorized[idx2],
    y: vectorized[idx2 + 1],
    z: vectorized[idx2 + 2],
  };

  return [vec2.x - vec1.x, vec2.y - vec1.y, vec2.z - vec1.z];
}

function calculateHeelAndFootIndexSimilarity(
  referenceVectorized: number[],
  userVectorized: number[]
) {
  // HEEL -> FOOT_INDEX 벡터 추출
  const refLeftHeelToFoot = getLimbVector(
    referenceVectorized,
    "LEFT_HEEL",
    "LEFT_FOOT_INDEX"
  );
  const refRightHeelToFoot = getLimbVector(
    referenceVectorized,
    "RIGHT_HEEL",
    "RIGHT_FOOT_INDEX"
  );
  const userLeftHeelToFoot = getLimbVector(
    userVectorized,
    "LEFT_HEEL",
    "LEFT_FOOT_INDEX"
  );
  const userRightHeelToFoot = getLimbVector(
    userVectorized,
    "RIGHT_HEEL",
    "RIGHT_FOOT_INDEX"
  );

  // 벡터 유사도 계산
  const leftRes = calculateCosAndEucTotalJoint(
    refLeftHeelToFoot,
    userLeftHeelToFoot
  );
  const leftHeelToFootSimilarity = calculateCosAndEucMixedScore(leftRes, 1);

  console.log("Ref Left Heel to Foot:", refLeftHeelToFoot);
  console.log("User Left Heel to Foot:", userLeftHeelToFoot);
  console.log("Left Heel to Foot Similarity:", leftHeelToFootSimilarity);

  const rightRes = calculateCosAndEucTotalJoint(
    refRightHeelToFoot,
    userRightHeelToFoot
  );
  const rightHeelToFootSimilarity = calculateCosAndEucMixedScore(rightRes, 1);

  console.log("Ref Right Heel to Foot:", refRightHeelToFoot);
  console.log("User Right Heel to Foot:", userRightHeelToFoot);
  console.log("Right Heel to Foot Similarity:", rightHeelToFootSimilarity);
  const similarity = (leftHeelToFootSimilarity + rightHeelToFootSimilarity) / 2;
  return Math.pow(similarity / 100, 10) * 100; // 제곱하여 강조
}

export interface SimilarityResult {
  vectorizedScore: number;
  angleScore: number;
  combinedScore: number;
}

// 벡터화된 데이터와 각도 데이터를 모두 사용한 유사도 계산 함수
export function calculateSimilarityWithAnglesAndVectorized(
  referenceVectorized: number[],
  userVectorized: number[],
  referenceAngles: JointAngles | null,
  userAngles: JointAngles | null
): SimilarityResult {
  //   const vectorizedScore = calculateSimilarityWithVectorized(
  //     referenceVectorized,
  //     userVectorized,
  //     1
  //   );

  const heelAndFootIndexScore = calculateHeelAndFootIndexSimilarity(
    referenceVectorized,
    userVectorized
  );
  const angleScore =
    referenceAngles && userAngles
      ? calculateSimilarityWithAngles(referenceAngles, userAngles, "_")
      : 0;

  // 가중치 조정 (벡터화된 데이터에 더 큰 비중 부여)
  const lambda = 1;
  const combinedScore =
    lambda * angleScore + (1 - lambda) * heelAndFootIndexScore;

  return {
    vectorizedScore: heelAndFootIndexScore,
    angleScore,
    combinedScore,
  };
}

// 좌우 반전된 벡터 데이터 생성 함수
export const normalizeMirroredVectorized = (vectorized: number[]): number[] => {
  const swapped: number[] = [...vectorized];

  // console.log("vector: ", vectorized);

  // 1단계: 모든 x 좌표 부호 반전 (전체 거울 반전)
  for (let i = 0; i < swapped.length; i += 3) {
    swapped[i] *= -1; // x 좌표만 부호 반전
  }

  // 2단계: 좌우 대칭 쌍 교환
  const mirrorPairs = [
    [LANDMARK_INDICES.LEFT_EAR, LANDMARK_INDICES.RIGHT_EAR],
    [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.RIGHT_SHOULDER],
    [LANDMARK_INDICES.LEFT_ELBOW, LANDMARK_INDICES.RIGHT_ELBOW],
    [LANDMARK_INDICES.LEFT_WRIST, LANDMARK_INDICES.RIGHT_WRIST],
    [LANDMARK_INDICES.LEFT_INDEX, LANDMARK_INDICES.RIGHT_INDEX],
    [LANDMARK_INDICES.LEFT_HIP, LANDMARK_INDICES.RIGHT_HIP],
    [LANDMARK_INDICES.LEFT_KNEE, LANDMARK_INDICES.RIGHT_KNEE],
    [LANDMARK_INDICES.LEFT_ANKLE, LANDMARK_INDICES.RIGHT_ANKLE],
    [LANDMARK_INDICES.LEFT_HEEL, LANDMARK_INDICES.RIGHT_HEEL],
  ];

  // 좌우 landmark 위치 교환 (x, y, z 모두)
  mirrorPairs.forEach(([left, right]) => {
    const leftIdx = left * 3;
    const rightIdx = right * 3;

    // x, y, z 세 값을 통째로 교환
    for (let i = 0; i < 3; i++) {
      const temp = swapped[leftIdx + i];
      swapped[leftIdx + i] = swapped[rightIdx + i];
      swapped[rightIdx + i] = temp;
    }
  });

  // console.log("swapped: ", swapped);

  return swapped;
};

// 좌우 반전된 각도 데이터 생성 함수
export const normalizeMirroredAngles = (angles: JointAngles): JointAngles => {
  const swapped: Partial<JointAngles> = { ...angles };

  // 좌우 대칭 쌍 정의
  const mirrorPairs = [
    ["leftShoulder", "rightShoulder"],
    ["leftElbow", "rightElbow"],
    ["leftWrist", "rightWrist"],
    ["leftHip", "rightHip"],
    ["leftKnee", "rightKnee"],
    ["leftAnkle", "rightAnkle"],
    ["leftHipShoulderAlign", "rightHipShoulderAlign"],
  ];

  // 각 쌍의 값을 교환
  mirrorPairs.forEach(([left, right]) => {
    const temp = swapped[left as keyof JointAngles];
    swapped[left as keyof JointAngles] = swapped[right as keyof JointAngles];
    swapped[right as keyof JointAngles] = temp;
  });

  // spine, neckAngle은 중앙 기준이므로 그대로 유지
  return swapped as JointAngles;
};
