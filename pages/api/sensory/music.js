/**
 * Replicate MusicGen / Stable Audio 등 연동용 스텁.
 * POST { prompt, tempo, energy } → { audioUrl } (추후 구현)
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, tempo, energy } = req.body || {};

  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(501).json({
      error: "REPLICATE_API_TOKEN not configured",
      hint: "클라이언트 AmbientSoundscape(Web Audio)를 사용하거나 Replicate MusicGen을 연결하세요.",
      profile: { prompt, tempo, energy },
    });
  }

  return res.status(501).json({
    error: "Music generation not implemented yet",
    hint: "replicate.run('meta/musicgen', { input: { prompt } }) 패턴으로 확장",
  });
}
