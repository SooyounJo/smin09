export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "sotest_0924",
    timestamp: new Date().toISOString(),
  });
}
