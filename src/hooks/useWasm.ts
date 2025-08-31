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
        
        // Load WASM module using dynamic import
        const wasmModule = await import("../../public/wasm_math.js");
        
        // Initialize WASM
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