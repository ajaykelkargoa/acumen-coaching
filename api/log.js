export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { coach, coachee, session, date, time, status } = req.body || {};
  if (!coach || !coachee || !session || !date || !time || !status)
    return res.status(400).json({ error: 'All fields required.' });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO  = process.env.GITHUB_REPO;
  const API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/sessions.json`;
  const HEADERS = { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

  try {
    const fr = await fetch(API_URL, { headers: HEADERS });
    if (!fr.ok) return res.status(500).json({ error: 'Could not read session data.' });
    const fd = await fr.json();
    const sessions = JSON.parse(Buffer.from(fd.content, 'base64').toString('utf-8'));

    const dup = sessions.find(s => s.coach === coach && s.coachee === coachee && s.session === session);
    if (dup) return res.status(409).json({ error: `Already logged: ${session} with ${coachee}.` });

    sessions.push({
      id: Date.now(), coach, coachee, session,
      date, time, status,
      loggedAt: new Date().toISOString()
    });

    const sr = await fetch(API_URL, {
      method: 'PUT', headers: HEADERS,
      body: JSON.stringify({
        message: `Log: ${coach} - ${session}`,
        content: Buffer.from(JSON.stringify(sessions, null, 2)).toString('base64'),
        sha: fd.sha
      })
    });
    if (!sr.ok) return res.status(500).json({ error: 'Failed to save. Please try again.' });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
