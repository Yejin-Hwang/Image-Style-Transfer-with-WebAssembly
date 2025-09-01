import { useState, useCallback } from 'react'
import { type PreprocessedImage, ImagePreprocessor } from '@/utils/imagePreprocessing'
import { type OnnxModelConfig } from '@/utils/onnxModels'
import * as ort from 'onnxruntime-web'

export interface StyleTransferResult {
  originalImage: string
  styledImage: string | null
  processingTime: number | null
  error: string | null
  // ONNX connection status and processing method
  onnxStatus: 'connected' | 'failed' | 'not_attempted'
  processingMethod: 'onnx' | 'simulation' | 'none'
  statusMessage: string
  // Tensor data for debugging and reprocessing
  inputTensor?: {
    data: Float32Array
    dims: readonly number[]
    dataRange: { min: number; max: number }
  }
  outputTensor?: {
    data: Float32Array
    dims: readonly number[]
    dataRange: { min: number; max: number }
  }

}
interface UseStyleTransferReturn {
  result: StyleTransferResult | null
  isTransferring: boolean
  transferStyle: (preprocessedImage: PreprocessedImage, modelConfig: OnnxModelConfig, originalImageUrl?: string) => Promise<void>
  clearResult: () => void
}

// ONNX model cache
const modelCache = new Map<string, ort.InferenceSession>()

// Safe array min/max calculation function
function getArrayMinMax(array: Float32Array): { min: number; max: number } {
  if (array.length === 0) return { min: 0, max: 0 }
  
  let min = array[0]
  let max = array[0]
  
  for (let i = 1; i < array.length; i++) {
    if (array[i] < min) min = array[i]
    if (array[i] > max) max = array[i]
  }
  
  return { min, max }
}

export function useStyleTransfer(): UseStyleTransferReturn {
  const [result, setResult] = useState<StyleTransferResult | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)

  const transferStyle = useCallback(async (
    preprocessedImage: PreprocessedImage,
    modelConfig: OnnxModelConfig,
    originalImageUrl?: string
  ) => {
    setIsTransferring(true)
    setResult(null)

    try {
      const startTime = performance.now()
      
      let styledImage: string
      let inputTensor: ort.Tensor | undefined
      let outputTensor: ort.Tensor | undefined

      
      try {
        // Attempt actual ONNX model inference
        console.log('Attempting ONNX model inference...')
        const inferenceResult = await runOnnxInference(preprocessedImage, modelConfig)
        styledImage = inferenceResult.styledImage
        inputTensor = inferenceResult.inputTensor
        outputTensor = inferenceResult.outputTensor
        console.log('ONNX inference successful')
      } catch (onnxError) {
        console.warn('ONNX inference failed, falling back to simulation:', onnxError)
        
        // Fallback to simulation when ONNX fails
        styledImage = await simulateStyleTransfer(preprocessedImage, modelConfig)
        console.log('Fallback simulation completed')
      }
      
      const processingTime = performance.now() - startTime
      
      // Set status based on ONNX success
      const onnxStatus = inputTensor ? 'connected' : 'failed'
      const processingMethod = inputTensor ? 'onnx' : 'simulation'
      const statusMessage = inputTensor 
        ? 'ONNX model inference completed successfully.'
        : 'ONNX model connection failed, showing simulation results.'
      
      setResult({
        originalImage: originalImageUrl || '',
        styledImage,
        processingTime,
        error: null,
        onnxStatus,
        processingMethod,
        statusMessage,
        inputTensor: inputTensor ? {
          data: inputTensor.data as Float32Array,
          dims: inputTensor.dims,
          dataRange: getArrayMinMax(inputTensor.data as Float32Array)
        } : undefined,
        outputTensor: outputTensor ? {
          data: outputTensor.data as Float32Array,
          dims: outputTensor.dims,
          dataRange: getArrayMinMax(outputTensor.data as Float32Array)
        } : undefined
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Style transfer failed'
      console.error('Style transfer error:', error)
      setResult({
        originalImage: '',
        styledImage: null,
        processingTime: null,
        error: errorMessage,
        onnxStatus: 'failed',
        processingMethod: 'none',
        statusMessage: `Style transfer failed: ${errorMessage}`
      })
    } finally {
      setIsTransferring(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
  }, [])

  return {
    result,
    isTransferring,
    transferStyle,
    clearResult
  }
}

// Execute actual ONNX model inference
async function runOnnxInference(
  preprocessedImage: PreprocessedImage,
  modelConfig: OnnxModelConfig
): Promise<{
  styledImage: string
  inputTensor: ort.Tensor
  outputTensor: ort.Tensor
}> {
  try {
    console.log('Starting ONNX inference...')
    console.log('Model config:', modelConfig)
    console.log('Preprocessed image:', {
      width: preprocessedImage.width,
      height: preprocessedImage.height,
      dataLength: preprocessedImage.data.length,
      dataType: preprocessedImage.data.constructor.name,
      tensorShape: preprocessedImage.tensorShape,
      normalizationType: preprocessedImage.normalizationType,
      dataRange: preprocessedImage.dataRange
    })
    
    // 1. 모델 로드 (캐시된 경우 재사용)
    const session = await loadModel(modelConfig.filename)
    
    // 2. 모델 메타데이터 확인
    console.log('Model input names:', session.inputNames)
    console.log('Model output names:', session.outputNames)
    
    // 3. 입력 텐서 검증 및 준비
    console.log('Validating input tensor...')
    const inputTensor = prepareInputTensor(preprocessedImage, modelConfig)
    
    // 4. 텐서 데이터 검증
    const tensorData = inputTensor.data as Float32Array
    const tensorDims = inputTensor.dims
    
    console.log('Input tensor validation:', {
      shape: tensorDims,
      dataType: inputTensor.type,
      dataLength: tensorData.length,
      dataRange: getArrayMinMax(tensorData),
      expectedShape: modelConfig.inputShape
    })
    
    // Validate tensor dimensions match model expectations
    if (tensorDims.length !== modelConfig.inputShape.length) {
      throw new Error(`Tensor dimension mismatch. Expected ${modelConfig.inputShape.length}D, got ${tensorDims.length}D`)
    }
    
    for (let i = 0; i < tensorDims.length; i++) {
      if (tensorDims[i] !== modelConfig.inputShape[i]) {
        throw new Error(`Tensor dimension ${i} mismatch. Expected ${modelConfig.inputShape[i]}, got ${tensorDims[i]}`)
      }
    }
    console.log('Input tensor details:', {
      dims: inputTensor.dims,
      type: inputTensor.type,
      dataLength: inputTensor.data.length,
      shape: inputTensor.dims.join('x')
    })
    
    // 모델이 기대하는 입력과 비교
    console.log('Expected input shape from config:', modelConfig.inputShape)
    console.log('Actual tensor shape:', inputTensor.dims)
    
    // 4. 모델 추론 실행
    console.log('Running model inference...')
    const outputs = await session.run({
      [session.inputNames[0]]: inputTensor
    })
    console.log('Model outputs:', outputs)
    
    // 5. 출력 데이터를 이미지로 변환
    const styledImage = await convertOutputToImage(outputs, modelConfig)
    console.log('Style transfer completed successfully')
    
    // Get the output tensor for postprocessing
    const outputKey = Object.keys(outputs)[0]
    const outputTensor = outputs[outputKey] as ort.Tensor
    
    console.log('Style transfer completed successfully')
    
    return {
      styledImage,
      inputTensor,
      outputTensor
    }
  } catch (error) {
    console.error('ONNX inference failed:', error)
    throw new Error(`Model inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// ONNX 모델 로드
async function loadModel(filename: string): Promise<ort.InferenceSession> {
  // 캐시된 모델이 있으면 반환
  if (modelCache.has(filename)) {
    console.log(`Using cached model: ${filename}`)
    return modelCache.get(filename)!
  }
  
  try {
    console.log(`Loading ONNX model: ${filename}`)
    
    // 모델 파일 경로
    const modelPath = `/models/${filename}`
    console.log(`Model path: ${modelPath}`)
    
    // 모델 로드
    console.log(`Loading model: ${filename}...`)
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'disabled', // 그래프 최적화 완전 비활성화하여 경고 제거
      enableCpuMemArena: false, // 메모리 할당 최적화 비활성화
      enableMemPattern: false, // 메모리 패턴 최적화 비활성화
      logSeverityLevel: 3 // 에러만 표시 (0: verbose, 1: info, 2: warning, 3: error, 4: fatal)
    })
    
    // 캐시에 저장
    modelCache.set(filename, session)
    
    console.log(`✅ Model loaded successfully: ${filename}`)
    console.log(`📊 Model details:`, {
      inputNames: session.inputNames,
      outputNames: session.outputNames
    })
    return session
  } catch (error) {
    console.error(`❌ Failed to load model ${filename}:`, error)
    
    // ONNX Runtime 경고는 정상 작동에 영향 없음을 명시
    if (error instanceof Error && error.message.includes('Initializer')) {
      console.info(`ℹ️ Note: ONNX Runtime warnings about initializers are normal and don't affect functionality`)
    }
    
    throw new Error(`Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// 입력 텐서 준비 (NHWC 형식으로 수정)
function prepareInputTensor(
  preprocessedImage: PreprocessedImage,
  modelConfig: OnnxModelConfig
): ort.Tensor {
  // Use the expected model input shape instead of the preprocessed image shape
  const [batch, targetHeight, targetWidth, channels] = modelConfig.inputShape
  
  console.log('Preparing input tensor with expected model shape:', [batch, targetHeight, targetWidth, channels])
  console.log('Preprocessed image dimensions:', {
    width: preprocessedImage.width,
    height: preprocessedImage.height,
    dataLength: preprocessedImage.data.length,
    normalizationType: preprocessedImage.normalizationType,
    dataRange: preprocessedImage.dataRange
  })
  
  // Validate tensor compatibility
  const validation = ImagePreprocessor.validatePreprocessedImage(preprocessedImage, modelConfig)
  if (!validation.isValid) {
    throw new Error(`Tensor validation failed: ${validation.error}`)
  }
  
  if (validation.warnings) {
    console.warn('Tensor validation warnings:', validation.warnings)
  }
  
  // Check if data length matches expected tensor size
  const expectedDataLength = batch * targetHeight * targetWidth * channels
  if (preprocessedImage.data.length !== expectedDataLength) {
    console.warn(`Data length mismatch: expected ${expectedDataLength}, got ${preprocessedImage.data.length}`)
    console.warn('This may indicate the image was not properly resized to target dimensions')
    
    // For now, we'll use the data as-is, but this should be fixed in preprocessing
    // The issue is likely that maintainAspectRatio is true, causing non-square dimensions
  }
  
  // Use the preprocessed data directly (already in correct format)
  const inputData = preprocessedImage.data
  
  // Create tensor with the expected model input shape
  const tensor = new ort.Tensor('float32', inputData, [batch, targetHeight, targetWidth, channels])
  
  console.log('Input tensor prepared successfully')
  console.log('Final tensor shape:', [batch, targetHeight, targetWidth, channels])
  console.log('Tensor data range:', preprocessedImage.dataRange)
  console.log('Normalization type:', preprocessedImage.normalizationType)
  
  return tensor
}

// 모델 출력을 이미지로 변환
async function convertOutputToImage(
  outputs: ort.InferenceSession.OnnxValueMapType,
  modelConfig: OnnxModelConfig
): Promise<string> {
  try {
    console.log('Converting model output to image...')
    
    // 출력 텐서 가져오기 (첫 번째 출력 사용)
    const outputKey = Object.keys(outputs)[0]
    const outputTensor = outputs[outputKey] as ort.Tensor
    
    if (!outputTensor) {
      throw new Error('No output tensor found')
    }
    
    console.log('Output tensor:', {
      dims: outputTensor.dims,
      type: outputTensor.type,
      dataLength: outputTensor.data.length
    })
    
    // 텐서 데이터 추출
    const outputData = outputTensor.data as Float32Array
    const [, height, width, channels] = outputTensor.dims
    
    // Canvas 생성
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }
    
    // ImageData 생성
    const imageData = ctx.createImageData(width, height)
    const data = imageData.data
    
    // Float32Array를 Uint8ClampedArray로 변환
    for (let i = 0; i < height * width; i++) {
      const pixelIndex = i * 4
      const dataIndex = i * channels
      
      // RGB 값 추출 (모델별 정규화 범위에 따라 변환)
      let r, g, b
      
      // Determine normalization type based on model config
      const isAnimeGAN = modelConfig.mean[0] === 0.5 && modelConfig.std[0] === 0.5
      const isImageNet = modelConfig.mean[0] === 0.485 && modelConfig.std[0] === 0.229
      
      if (isAnimeGAN) {
        // AnimeGAN 모델: -1~1 범위를 0-255로 변환
        r = Math.max(0, Math.min(255, Math.round(((outputData[dataIndex] + 1) / 2) * 255)))
        g = Math.max(0, Math.min(255, Math.round(((outputData[dataIndex + 1] + 1) / 2) * 255)))
        b = Math.max(0, Math.min(255, Math.round(((outputData[dataIndex + 2] + 1) / 2) * 255)))
      } else if (isImageNet) {
        // ImageNet 정규화 모델: 0~1 범위를 0-255로 변환
        r = Math.max(0, Math.min(255, Math.round(outputData[dataIndex] * 255)))
        g = Math.max(0, Math.min(255, Math.round(outputData[dataIndex + 1] * 255)))
        b = Math.max(0, Math.min(255, Math.round(outputData[dataIndex + 2] * 255)))
      } else {
        // Custom normalization: assume output is in 0-1 range
        r = Math.max(0, Math.min(255, Math.round(outputData[dataIndex] * 255)))
        g = Math.max(0, Math.min(255, Math.round(outputData[dataIndex + 1] * 255)))
        b = Math.max(0, Math.min(255, Math.round(outputData[dataIndex + 2] * 255)))
      }
      
      // 픽셀 데이터 설정
      data[pixelIndex] = r
      data[pixelIndex + 1] = g
      data[pixelIndex + 2] = b
      data[pixelIndex + 3] = 255 // Alpha
    }
    
    // Canvas에 이미지 데이터 적용
    ctx.putImageData(imageData, 0, 0)
    
    // Canvas를 data URL로 변환
    const dataUrl = canvas.toDataURL('image/png')
    console.log('Image conversion completed')
    
    return dataUrl
  } catch (error) {
    console.error('Failed to convert output to image:', error)
    throw new Error(`Output conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// 시뮬레이션된 스타일 전송 함수 (fallback용)
async function simulateStyleTransfer(
  preprocessedImage: PreprocessedImage,
  modelConfig: OnnxModelConfig
): Promise<string> {
  console.log('Running simulation style transfer...')
  
  // Canvas를 사용하여 스타일이 적용된 이미지 시뮬레이션
  const canvas = document.createElement('canvas')
  canvas.width = preprocessedImage.width
  canvas.height = preprocessedImage.height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // 원본 이미지 데이터를 다시 그리기
  const imageData = ctx.createImageData(preprocessedImage.width, preprocessedImage.height)
  const data = imageData.data
  
  // Float32Array를 Uint8ClampedArray로 변환 (시뮬레이션용)
  for (let i = 0; i < preprocessedImage.data.length; i += 3) {
    const pixelIndex = (i / 3) * 4
    const x = (i / 3) % preprocessedImage.width
    const y = Math.floor((i / 3) / preprocessedImage.width)
    
    // Color transformation simulation based on style
    let r = Math.round(preprocessedImage.data[i] * 255)
    let g = Math.round(preprocessedImage.data[i + 1] * 255)
    let b = Math.round(preprocessedImage.data[i + 2] * 255)
    
    // Apply style-specific color filters
    if (modelConfig.name.includes('Anime')) {
      // Anime style does not support simulation fallback
      // Must be applied only through ONNX inference
      throw new Error(
        'Anime style requires direct use of Anime ONNX models in the public/models folder. ONNX inference failed.'
      )
    } else if (modelConfig.name.includes('Picasso')) {
      // Picasso style: enhance contrast
      r = r > 128 ? Math.min(255, r * 1.4) : Math.max(0, r * 0.6)
      g = g > 128 ? Math.min(255, g * 1.4) : Math.max(0, g * 0.6)
      b = b > 128 ? Math.min(255, b * 1.4) : Math.max(0, b * 0.6)
    } else if (modelConfig.name.includes('Van Gogh')) {
      // Van Gogh style: thick brushstrokes and swirling pattern simulation
      // Position-based wave effect (brushstroke simulation)
      const waveX = Math.sin(x * 0.1) * 0.2
      const waveY = Math.cos(y * 0.08) * 0.3
      const intensity = (waveX + waveY) * 0.5 + 1.0
      
      // Van Gogh's characteristic warm colors (emphasize yellow, orange, red)
      r = Math.min(255, r * (1.5 + intensity * 0.3))
      g = Math.min(255, g * (1.4 + intensity * 0.2))
      b = Math.max(0, b * (0.6 + intensity * 0.1))
      
      // Enhance color contrast
      if (r > 128) r = Math.min(255, r + 25)
      if (g > 128) g = Math.min(255, g + 20)
      b = Math.max(0, b - 40)
      
      // Van Gogh style color harmony
      const brightness = (r + g + b) / 3
      if (brightness > 150) {
        // Make bright areas warmer
        r = Math.min(255, r + 15)
        g = Math.min(255, g + 10)
      } else {
        // Make dark areas deeper
        r = Math.max(0, r - 20)
        g = Math.max(0, g - 15)
        b = Math.max(0, b - 30)
      }
    } else if (modelConfig.name.includes('Cyberpunk')) {
      // Cyberpunk style: neon effects
      r = Math.min(255, r * 1.5)
      g = Math.max(0, g * 0.7)
      b = Math.min(255, b * 1.8)
    }
    
    data[pixelIndex] = Math.max(0, Math.min(255, r))
    data[pixelIndex + 1] = Math.max(0, Math.min(255, g))
    data[pixelIndex + 2] = Math.max(0, Math.min(255, b))
    data[pixelIndex + 3] = 255 // Alpha
  }
  
  ctx.putImageData(imageData, 0, 0)
  
  // Apply additional style-specific effects
  if (modelConfig.name.includes('Van Gogh')) {
    applyVanGoghBrushStrokes(ctx, preprocessedImage.width, preprocessedImage.height)
  } else if (modelConfig.name.includes('Anime')) {
    applyAnimeEffects(ctx, preprocessedImage.width, preprocessedImage.height)
  }
  
  // Convert canvas to data URL
  return canvas.toDataURL('image/png')
}

// Function to add Van Gogh style brush stroke effects
function applyVanGoghBrushStrokes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Additional layer for brush stroke effects
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.3
  
  // Draw brush strokes in multiple directions
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const length = 20 + Math.random() * 40
    const angle = Math.random() * Math.PI * 2
    
    ctx.strokeStyle = `hsl(${45 + Math.random() * 30}, 70%, 60%)` // Yellow-orange tones
    ctx.lineWidth = 2 + Math.random() * 3
    ctx.lineCap = 'round'
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length
    )
    ctx.stroke()
  }
  
  // Restore original settings
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1.0
}

// Function to add Anime style effects
function applyAnimeEffects(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Soft color gradient effects
  ctx.globalCompositeOperation = 'soft-light'
  ctx.globalAlpha = 0.3
  
  // Multiple directional soft gradients
  for (let i = 0; i < 3; i++) {
    const gradient = ctx.createLinearGradient(
      Math.random() * width,
      Math.random() * height,
      Math.random() * width,
      Math.random() * height
    )
    
    // Ghibli's characteristic warm colors
    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.1)') // Light yellow
    gradient.addColorStop(0.5, 'rgba(200, 255, 200, 0.1)') // Light green
    gradient.addColorStop(1, 'rgba(255, 200, 200, 0.1)') // Light red
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  
  // Sharp outline effects
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.2
  
  // Add soft border to image edges
  ctx.strokeStyle = 'rgba(100, 150, 100, 0.3)'
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, width - 4, height - 4)
  
  // Restore original settings
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1.0
}

// Clear model cache (memory management)
export function clearModelCache(): void {
  for (const [filename, session] of modelCache.entries()) {
    try {
      session.release()
      console.log(`Released model: ${filename}`)
    } catch (error) {
      console.error(`Failed to release model ${filename}:`, error)
    }
  }
  modelCache.clear()
}
