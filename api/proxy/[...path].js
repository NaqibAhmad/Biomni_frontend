// Vercel serverless function to proxy requests to HTTP backend
// This solves the mixed content issue by providing HTTPS-to-HTTPS communication

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://18.212.99.49:8000';

export default async function handler(req, res) {
  // Enable CORS for your frontend domain
  res.setHeader('Access-Control-Allow-Origin', 'https://biomni-frontend-9qo9.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, Accept, Origin, X-Requested-With');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get the path from the request
    const path = req.query.path || [];
    const pathString = Array.isArray(path) ? path.join('/') : path;
    
    // Construct the target URL
    const targetUrl = `${BACKEND_BASE_URL.replace(/\/$/, '')}/${pathString}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
    
    console.log(`Proxying ${req.method} ${pathString} to ${targetUrl}`);

    // Forward only safe/useful headers
    const headers = {};
    const allowedHeaders = ['content-type', 'authorization', 'cookie', 'ngrok-skip-browser-warning'];
    
    Object.keys(req.headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (allowedHeaders.includes(lowerKey) || lowerKey.startsWith('x-')) {
        headers[key] = req.headers[key];
      }
    });

    // Make the request to the backend
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      redirect: 'manual'
    });

    // Forward the response
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      // Skip dangerous headers
      if (!['content-length', 'content-security-policy'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    // Set response headers
    Object.keys(responseHeaders).forEach(key => {
      res.setHeader(key, responseHeaders[key]);
    });

    // Send the response
    res.status(response.status);
    
    if (response.body) {
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
}
