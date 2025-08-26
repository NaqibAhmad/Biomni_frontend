import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const EC2_BASE_URL = 'http://18.212.99.49';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method, url, headers, body } = req;
    
    // Extract the path from the request
    const path = req.url?.replace('/api/proxy', '') || '';
    const targetUrl = `${EC2_BASE_URL}${path}`;

    console.log(`Proxying ${method} request to: ${targetUrl}`);

    // Prepare headers for the EC2 request
    const ec2Headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '69420',
    };

    // Forward relevant headers
    if (headers.authorization) {
      ec2Headers.Authorization = headers.authorization;
    }

    // Make the request to EC2
    const response = await axios({
      method: method as any,
      url: targetUrl,
      headers: ec2Headers,
      data: body,
      timeout: 300000, // 5 minutes timeout
    });

    // Forward the response back to the client
    res.status(response.status).json(response.data);

  } catch (error: any) {
    console.error('Proxy error:', error);
    
    if (error.response) {
      // Forward error response from EC2
      res.status(error.response.status).json({
        error: error.response.data || 'Proxy error',
        status: error.response.status,
      });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        error: 'EC2 instance is not reachable',
        status: 503,
      });
    } else {
      res.status(500).json({
        error: 'Internal proxy error',
        status: 500,
      });
    }
  }
}
