import { JointAngles, poseData, poseVectorizedData } from "@/types";
import { LANDMARK_INDICES } from "../mediapipe/angle-calculator";
import {
  calculateSimilarityWithAngles,
  calculateSimilarityWithVectorized,
  normalizeMirroredAngles,
  normalizeMirroredVectorized,
} from "../mediapipe/similarity-calculator";

export function classifyPoseWithVectorized(
  vectorized: number[],
  angles?: JointAngles
) {
  let bestPose = "unknown";
  let maxDistance = 0;
  const distPerPose: Record<string, number[]> = {};
  const VEC_THRESHOLD = 90;
  const ANGLE_THRESHOLD = 90;

  // 좌우 반전 버전 생성
  const mirroredVectorized = normalizeMirroredVectorized(vectorized);
  const mirroredAngles = angles ? normalizeMirroredAngles(angles) : angles;

  for (const [name, poseVectorized] of Object.entries(poseVectorizedData)) {
    const poseAngles = poseData[name as keyof typeof poseData];

    // 원본과 반전 둘 다 계산
    const distanceOriginal = calculateSimilarityWithVectorized(
      poseVectorized,
      vectorized,
      1
    );
    const distanceMirrored = calculateSimilarityWithVectorized(
      poseVectorized,
      mirroredVectorized,
      1
    );

    const angleDistanceOriginal =
      angles && poseAngles
        ? calculateSimilarityWithAngles(angles, poseAngles, name)
        : 0;
    const angleDistanceMirrored =
      mirroredAngles && poseAngles
        ? calculateSimilarityWithAngles(mirroredAngles, poseAngles, name)
        : 0;

    // 더 유사한 쪽 선택
    const maxForThisPose =
      distanceOriginal > distanceMirrored ? distanceOriginal : distanceMirrored;
    const _angleMaxForThisPose =
      distanceOriginal > distanceMirrored
        ? angleDistanceOriginal
        : angleDistanceMirrored;
    const angleMaxForThisPose = angles
      ? _angleMaxForThisPose
      : ANGLE_THRESHOLD + 1; // 각도 데이터가 없으면 각도 조건 무시

    if (
      maxForThisPose > VEC_THRESHOLD &&
      angleMaxForThisPose > ANGLE_THRESHOLD &&
      angleMaxForThisPose > maxDistance
    ) {
      maxDistance = angleMaxForThisPose;
      bestPose = name;
    }

    distPerPose[name] = [maxForThisPose, angleMaxForThisPose];
  }

  console.log("distPerPose:", distPerPose);
  console.log("Max Distance:", maxDistance);
  console.log("Best Pose:", bestPose);

  return { bestPose, maxDistance };
}