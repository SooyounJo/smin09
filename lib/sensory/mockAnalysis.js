import { normalizeSensoryAnalysis } from "@/lib/sensory/parseResponse";

/**
 * OPENAI_API_KEY 없을 때 UI·WebGL·사운드스케이프 연동 확인용
 * @param {string[]} dominantColors
 */
export function buildMockAnalysis(dominantColors) {
  return normalizeSensoryAnalysis(
    {
      memoryImpression:
        "오래된 앨범 속 한 장면처럼, 부드러운 빛과 잔잔한 그림자가 겹쳐진 기억의 잔상이 떠오릅니다.",
      situationGuess:
        "해 질 무렵 창가에 앉아 하루를 정리하거나, 조용히 누군가를 기다리던 순간일 수 있습니다.",
      emotionKeywords: ["그리움", "고요", "따스함", "맑음", "잔향"],
      spatialKeywords: ["창가", "여백", "은은한 빛", "좁은 실내", "수평선"],
      scent: {
        blendName: "오후 서재 디퓨저",
        top: [
          "베르가못 (Citrus bergamia) FCF",
          "페퍼민트 (Mentha piperita) 스페인",
        ],
        heart: [
          "라벤더 메일lette (Lavandula angustifolia Maillette)",
          "로즈제리 cineole (Rosmarinus officinalis ct. cineole)",
        ],
        base: [
          "시더우드 버지니아 (Juniperus virginiana)",
          "베티버 HT (Vetiveria zizanioides)",
        ],
        mixRatioHint: "Top 20% · Heart 50% · Base 30%",
        narrative:
          "베르가못·페퍼민트가 상단을 열고, 라벤더·로즈마리가 중심을 잡으며, 시더·베티버가 잔향을 고정해 디퓨저에서 날카롭지 않게 믹스됩니다.",
      },
      music: {
        tempo: 68,
        energy: 0.28,
        mood: "ambient introspective",
        instruments: ["felt piano", "pad", "soft strings"],
        description: "낮은 템포의 패드와 피아노 잔향이 공간을 천천히 채우는 사운드.",
      },
      primaryModality: "scent",
      primaryModalityReason:
        "이미지의 공기감과 재질감이 강해, 향이 먼저 분위기를 전달하는 편이 자연스럽습니다.",
      paletteAdjustments: {
        hex: dominantColors?.length >= 4 ? dominantColors.slice(0, 4) : undefined,
      },
    },
    { dominantColors, mock: true }
  );
}
