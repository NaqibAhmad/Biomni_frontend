// Cloudflare Worker to proxy requests to HTTP backend
// Deploy this to Cloudflare Workers and use the worker URL

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const backendUrl = 'http://18.212.99.49'
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://biomni-frontend-9qo9.vercel.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning, Accept, Origin, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      }
    })
  }
  
  // Create new URL for backend
  const backendRequestUrl = new URL(url.pathname + url.search, backendUrl)
  
  // Create new request
  const backendRequest = new Request(backendRequestUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body
  })
  
  try {
    const response = await fetch(backendRequest)
    
    // Create response with CORS headers
    const corsResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers),
        'Access-Control-Allow-Origin': 'https://biomni-frontend-9qo9.vercel.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning, Accept, Origin, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      }
    })
    
    return corsResponse
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(`Proxy error: ${error.message}`, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://biomni-frontend-9qo9.vercel.app',
        'Content-Type': 'text/plain'
      }
    })
  }
}
