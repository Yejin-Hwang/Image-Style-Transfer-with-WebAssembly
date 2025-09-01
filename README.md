# Image Style Transfer with WebAssembly

A Next.js application that demonstrates WebAssembly integration with Rust for high-performance image processing.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Rust (with wasm32-unknown-unknown target)
- wasm-bindgen-cli

### Installation

1. **Clone the repository**
   ```bash
   git clone <https://github.com/Yejin-Hwang/Image-Style-Transfer-with-WebAssembly>
   cd Image-Style-Transfer-with-WebAssembly
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Rust WASM target**
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

4. **Install wasm-bindgen-cli**
   ```bash
   cargo install wasm-bindgen-cli
   ```

5. **Build the WASM module**
   ```bash
   cd wasm/wasm-math
   wasm-bindgen --target web --out-dir ../../public target/wasm32-unknown-unknown/release/wasm_math.wasm
   cd ../..
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   ├── hooks/
│   │   └── useWasm.ts      # WASM integration hook
├── wasm/
│   └── wasm-math/          # Rust WASM project
│       ├── src/
│       │   └── lib.rs      # Rust source code
│       └── Cargo.toml      # Rust dependencies
├── public/                  # Static assets (WASM files)
├── next.config.ts          # Next.js configuration
└── package.json
```

## ⚙️ Configuration

### Next.js Configuration

The `next.config.ts` is configured to support WebAssembly:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    // Ensure WASM files are handled properly
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    
    return config;
  },
};

export default nextConfig;
```

### Rust WASM Configuration

The Rust project in `wasm/wasm-math/` is configured with:

```toml
[package]
name = "wasm-math"
version = "0.1.0"
edition = "2024"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
```

## 🔧 WASM Integration

### Building WASM

1. **Compile Rust to WASM:**
   ```bash
   cd wasm/wasm-math
   cargo build --target wasm32-unknown-unknown --release
   ```

2. **Generate JavaScript bindings:**
   ```bash
   wasm-bindgen --target web --out-dir ../../public target/wasm32-unknown-unknown/release/wasm_math.wasm
   ```

This generates:
- `wasm_math.js` - JavaScript glue code
- `wasm_math_bg.wasm` - Compiled WASM binary
- TypeScript definitions

### Using WASM in React

The `useWasm` hook loads and initializes the WASM module:

```typescript
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
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Module Resolution Errors

**Problem:** `Module not found: Can't resolve '/wasm_math.js'`

**Solution:** 
- Ensure WASM files are built and placed in the `public/` directory
- Use relative import path: `../../public/wasm_math.js`
- Don't use absolute paths like `/wasm_math.js`

#### 2. Turbopack Compatibility Issues

**Problem:** `Webpack is configured while Turbopack is not`

**Solution:**
- Remove `--turbopack` flag from package.json scripts
- Use webpack for better WASM support
- Update scripts to: `"dev": "next dev"`

#### 3. WASM Loading Failures

**Problem:** `Failed to load WASM`

**Solution:**
- Verify `wasm-bindgen-cli` is installed
- Rebuild WASM files after Rust code changes
- Check browser console for CORS or network errors

#### 4. Build Configuration Issues

**Problem:** `asyncWebAssembly` not supported

**Solution:**
- Ensure `next.config.ts` has proper webpack configuration
- Restart development server after config changes
- Use webpack instead of Turbopack

### Debugging Steps

1. **Check file existence:**
   ```bash
   ls -la public/wasm_math*
   ```

2. **Verify WASM compilation:**
   ```bash
   cd wasm/wasm-math
   cargo build --target wasm32-unknown-unknown --release
   ```

3. **Check browser console** for detailed error messages

4. **Verify import path** in `useWasm.ts`

## 📝 Development Workflow

### Making Changes to Rust Code

1. Edit `wasm/wasm-math/src/lib.rs`
2. Rebuild WASM:
   ```bash
   cd wasm/wasm-math
   cargo build --target wasm32-unknown-unknown --release
   wasm-bindgen --target web --out-dir ../../public target/wasm32-unknown-unknown/release/wasm_math.wasm
   cd ../..
   ```
3. Restart development server

### Adding New WASM Functions

1. Add function to `wasm/wasm-math/src/lib.rs`:
   ```rust
   #[wasm_bindgen]
   pub fn new_function(input: String) -> String {
       // Your implementation
       input.to_uppercase()
   }
   ```

2. Rebuild WASM (see above)
3. Use in React:
   ```typescript
   const result = wasm.new_function("hello world");
   ```

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Vercel Deployment

1. Push to GitHub
2. Connect repository to Vercel
3. Ensure `public/` directory is included in build
4. Deploy

## 📚 Resources

- [WebAssembly](https://webassembly.org/)
- [wasm-bindgen](https://rustwasm.github.io/wasm-bindgen/)
- [Next.js WebAssembly](https://nextjs.org/docs/app/building-your-application/optimizing/webassembly)
- [Rust WASM Book](https://rustwasm.github.io/docs/book/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
