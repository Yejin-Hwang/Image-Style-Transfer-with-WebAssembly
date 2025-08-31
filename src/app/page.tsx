"use client";
import useWasm from "@/hooks/useWasm";
import { useState } from "react";
export default function Home() {
  const wasm = useWasm();
  const [input, setInput] = useState(10);
  const [result, setResult] = useState<number | null>(null);
  const computeFactorial = () => {
    if (!wasm) return;
    setResult(wasm.factorial(input));
  };
  return (
    <main className="min-h-screen p-24">
      <h1 className="text-4xl font-bold mb-8">Next.js + WASM = 🔥</h1>
      <input
        type="number"
        value={input}
        onChange={(e) => setInput(Number(e.target.value))}
        className="p-2 border rounded"
      />
      <button
        onClick={computeFactorial}
        className="ml-4 p-2 bg-blue-600 text-white rounded"
      >
        Compute Factorial (WASM)
      </button>
      {result !== null && (
        <p className="mt-4 text-xl">
          Factorial of {input} is <strong>{result}</strong> (computed in WASM)
        </p>
      )}
    </main>
  );
}