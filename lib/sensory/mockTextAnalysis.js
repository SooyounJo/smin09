import { normalizeSensoryAnalysis } from "@/lib/sensory/parseResponse";

/**
 * @param {string} memoryText
 */
export function buildMockTextAnalysis(memoryText) {
  const snippet = memoryText.trim().slice(0, 40) || "조용한 기억";
  return normalizeSensoryAnalysis(
    {
      memoryImpression: `「${snippet}…」에서 떠오르는 말투를 바탕으로, 잔잔하고 개인적인 회상의 결을 정리했습니다.`,
      situationGuess:
        "혼자 있던 시간, 또는 누군가와 나눈 대화 직후의 여운 속 장면일 수 있습니다.",
      emotionKeywords: ["그리움", "고요", "따스함", "맑음", "잔향"],
      spatialKeywords: ["실내", "은은한 빛", "좁은 공기", "창가", "여백"],
      scent: {
        blendName: "기억의 잔향 디퓨저",
        top: ["베르가못 (Citrus bergamia) FCF"],
        heart: ["라벤더 (Lavandula angustifolia)"],
        base: ["시더우드 (Juniperus virginiana)"],
        mixRatioHint: "Top 25% · Heart 45% · Base 30%",
        narrative: "텍스트의 고요함에 맞춘 가벼운 시트러스와 라벤더, 시더 고정.",
      },
      music: {
        tempo: 70,
        energy: 0.3,
        mood: "회상 앰비언트",
        instruments: ["felt piano", "pad"],
        description: "말투의 속도에 맞춘 낮은 템포 피아노와 패드 잔향.",
      },
      primaryModality: "music",
      primaryModalityReason:
        "서사와 리듬이 강한 회상이라, 음악이 먼저 분위기를 잡는 편이 자연스럽습니다.",
      paletteAdjustments: {
        hex: ["#6b8cce", "#9a8fd4", "#e8c97a", "#7ec4b8"],
      },
      visualComposition: {
        subjectX: 0.48,
        subjectY: 0.42,
        dominantAngleDeg: 24,
        motionSpeed: 0.35,
        layoutStyle: 0,
      },
    },
    { dominantColors: ["#6b8cce", "#9a8fd4", "#e8c97a", "#7ec4b8"], mock: true }
  );
}
