// src/hooks/useWasm.ts
import { useState, useEffect } from "react";
export default function useWasm() {
  const [wasm, setWasm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWasm() {
      try {
        setIsLoading(true);
        setError(null);
        
        // WASM 모듈 import
        const wasmModule = await import("../wasm-math/wasm_math");
        
        // WASM 초기화
        const wasmInstance = await wasmModule.default();
        
        setWasm(wasmInstance);
      } catch (err) {
        console.error("Failed to load WASM:", err);
        setError(err instanceof Error ? err.message : "Failed to load WASM");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadWasm();
  }, []);

  return { wasm, isLoading, error };
}