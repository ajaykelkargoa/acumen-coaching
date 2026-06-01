export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const GITHUB_TOKEN   = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER   = process.env.GITHUB_OWNER;
  const GITHUB_REPO    = process.env.GITHUB_REPO;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/sessions.json`;
  const HEADERS = { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' };

  const { password, coach } = req.query;
  try {
    const fr = await fetch(API_URL, { headers: HEADERS });
    if (!fr.ok) return res.status(500).json({ error: 'Could not read data.' });
    const fd = await fr.json();
    const sessions = JSON.parse(Buffer.from(fd.content, 'base64').toString('utf-8'));
    if (password === ADMIN_PASSWORD) return res.status(200).json({ sessions });
    if (coach) return res.status(200).json({ sessions: sessions.filter(s => s.coach === coach) });
    return res.status(401).json({ error: 'Unauthorized' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error.' });
  }
}
