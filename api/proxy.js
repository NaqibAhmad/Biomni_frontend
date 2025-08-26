// Vercel serverless function to proxy requests to HTTP backend
// This solves the mixed content issue by providing HTTPS-to-HTTPS communication

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://18.212.99.49:8000';

export default async function handler(req, res) {
  console.log('=== PROXY REQUEST START ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  
  // Enable CORS for your frontend domain
  res.setHeader('Access-Control-Allow-Origin', 'https://biomni-frontend-9qo9.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, Accept, Origin, X-Requested-With');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    res.status(200).end();
    return;
  }

  try {
    // Get the path from the URL
    const url = new URL(req.url, `https://${req.headers.host}`);
    const path = url.pathname.replace('/api/proxy', '');
    
    // Construct the target URL
    const targetUrl = `${BACKEND_BASE_URL}${path}${url.search}`;
    
    console.log(`Proxying ${req.method} ${path} to ${targetUrl}`);
    console.log(`BACKEND_BASE_URL: ${BACKEND_BASE_URL}`);

    // Forward only safe/useful headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    const allowedHeaders = ['content-type', 'authorization', 'cookie', 'ngrok-skip-browser-warning'];
    
    Object.keys(req.headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (allowedHeaders.includes(lowerKey) || lowerKey.startsWith('x-')) {
        headers[key] = req.headers[key];
      }
    });

    console.log(`Request headers:`, headers);

    // Make the request to the backend
    console.log('Making fetch request to:', targetUrl);
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      redirect: 'manual'
    });

    console.log(`Backend response status: ${response.status}`);
    console.log(`Backend response headers:`, Object.fromEntries(response.headers.entries()));

    // Get the response content type
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    console.log(`Content-Type: ${contentType}, isJson: ${isJson}`);

    // Forward the response headers
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
      if (isJson) {
        // For JSON responses, parse and return as JSON
        const jsonData = await response.json();
        console.log(`JSON response data:`, jsonData);
        res.json(jsonData);
      } else {
        // For other responses, return as buffer
        const buffer = await response.arrayBuffer();
        const text = new TextDecoder().decode(buffer);
        console.log(`Text response:`, text);
        res.send(Buffer.from(buffer));
      }
    } else {
      console.log(`Empty response body`);
      res.end();
    }

    console.log('=== PROXY REQUEST END ===');

  } catch (error) {
    console.error('=== PROXY ERROR ===');
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message,
      backendUrl: BACKEND_BASE_URL,
      requestUrl: req.url
    });
  }
}
