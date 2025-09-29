import React, { useState } from "react";
import { BiomniAPI } from "@/lib/api";

const ProxyTest: React.FC = () => {
  const [status, setStatus] = useState<string>("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testProxy = async () => {
    setStatus("testing");
    setError(null);
    setResult(null);

    try {
      const api = new BiomniAPI();
      const response = await api.healthCheck();
      setResult(response);
      setStatus("success");
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setStatus("error");
    }
  };

  const testDirect = async () => {
    setStatus("testing");
    setError(null);
    setResult(null);

    try {
      const api = new BiomniAPI("https://api.mybioai.net");
      const response = await api.healthCheck();
      setResult(response);
      setStatus("success");
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setStatus("error");
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Proxy Test</h3>

      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={testProxy}
            disabled={status === "testing"}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test Proxy (HTTPS)
          </button>

          <button
            onClick={testDirect}
            disabled={status === "testing"}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test Direct (HTTP)
          </button>
        </div>

        {status === "testing" && (
          <div className="text-blue-600">Testing connection...</div>
        )}

        {status === "success" && result && (
          <div className="text-green-600">
            <div className="font-semibold">Success!</div>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {status === "error" && error && (
          <div className="text-red-600">
            <div className="font-semibold">Error:</div>
            <div className="mt-1">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProxyTest;
