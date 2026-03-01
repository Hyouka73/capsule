export default function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const data = req.body || {};
            const msg = `🚨 PWA DEBUG | COMP: ${data.component || '-'} | EV: ${data.event || '-'} | MSG: ${data.message || '-'}`;
            console.log(msg);
        } catch (e) {
            console.log('🚨 PWA DEBUG | Error parsing body', e);
        }
        res.status(200).json({ success: true });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
