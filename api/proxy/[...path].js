export default async function handler(req, res) {
  const { path } = req.query;
  const backendUrl = 'https://allowing-ultimately-roughy.ngrok-free.app';
  
  try {
    const url = `${backendUrl}/${path.join('/')}`;
    
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420',
        ...req.headers
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.json();
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to proxy request to backend',
      details: error.message 
    });
  }
}
