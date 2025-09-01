export interface OnnxModelConfig {
  name: string
  filename: string
  description: string
  inputShape: [number, number, number, number] // [batch, height, width, channels] - NHWC 형식
  mean: number[]
  std: number[]
  supportedFormats: string[]
  maxInputSize: number
}

export const ONNX_MODELS: Record<string, OnnxModelConfig> = {
  anime: {
    name: "Anime (Ghibli Style)",
    filename: "AnimeGANv3_Hayao_36.onnx",
    description: "Transforms images into Studio Ghibli anime style using Hayao model",
    inputShape: [1, 512, 512, 3], // NHWC 형식: [batch, height, width, channels] - GitHub releases 기준
    mean: [0.5, 0.5, 0.5], // AnimeGAN은 -1~1 범위 사용
    std: [0.5, 0.5, 0.5], // AnimeGAN은 -1~1 범위 사용
    supportedFormats: ["jpg", "jpeg", "png", "webp"],
    maxInputSize: 512
  },
  "anime-shinkai": {
    name: "Anime (Shinkai Style)",
    filename: "AnimeGANv3_Shinkai_37.onnx",
    description: "Transforms images into Makoto Shinkai anime style",
    inputShape: [1, 512, 512, 3], // NHWC 형식: [batch, height, width, channels] - GitHub releases 기준
    mean: [0.5, 0.5, 0.5], // AnimeGAN은 -1~1 범위 사용
    std: [0.5, 0.5, 0.5], // AnimeGAN은 -1~1 범위 사용
    supportedFormats: ["jpg", "jpeg", "png", "webp"],
    maxInputSize: 512
  },
  picasso: {
    name: "Picasso",
    filename: "picasso.onnx",
    description: "Applies Picasso's cubist painting style",
    inputShape: [1, 3, 224, 224], // NHWC 형식: 모든 모델을 512x512로 통일
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    supportedFormats: ["jpg", "jpeg", "png", "webp"],
    maxInputSize: 512
  },
  "van-gogh": {
    name: "Van Gogh",
    filename: "vangogh.onnx",
    description: "Transforms images into Van Gogh's post-impressionist style",
    inputShape: [1, 512, 512, 3], // NHWC 형식: 모든 모델을 512x512로 통일
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    supportedFormats: ["jpg", "jpeg", "png", "webp"],
    maxInputSize: 512
  },
  cyberpunk: {
    name: "Cyberpunk",
    filename: "cyberpunk.onnx",
    description: "Applies futuristic cyberpunk aesthetic",
    inputShape: [1, 512, 512, 3], // NHWC 형식: 모든 모델을 512x512로 통일
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    supportedFormats: ["jpg", "jpeg", "png", "webp"],
    maxInputSize: 512
  }
}

/**
 * Gets the configuration for a specific model
 */
export function getModelConfig(styleKey: string): OnnxModelConfig | null {
  return ONNX_MODELS[styleKey] || null
}

/**
 * Gets all available model configurations
 */
export function getAllModelConfigs(): OnnxModelConfig[] {
  return Object.values(ONNX_MODELS)
}

/**
 * Validates if an image is compatible with a specific model
 */
export function validateImageForModel(
  image: { width: number; height: number; channels: number },
  modelConfig: OnnxModelConfig
): { isValid: boolean; error?: string; suggestions?: string[] } {
  const suggestions: string[] = []

  // Check channels
  if (image.channels !== 3) {
    return {
      isValid: false,
      error: `Model requires 3 channels (RGB), got ${image.channels}`,
      suggestions: ["Convert image to RGB format"]
    }
  }

  // Check dimensions (NHWC 형식: [batch, height, width, channels])
  const [_, targetHeight, targetWidth, __] = modelConfig.inputShape
  const maxSize = modelConfig.maxInputSize

  if (image.width > maxSize || image.height > maxSize) {
    suggestions.push(`Resize image to ${maxSize}x${maxSize} or smaller`)
  }

  if (image.width !== targetWidth || image.height !== targetHeight) {
    suggestions.push(`Resize image to ${targetWidth}x${targetHeight} for optimal results`)
  }

  // Check if dimensions are powers of 2 (common requirement for some models)
  if (!isPowerOf2(image.width) || !isPowerOf2(image.height)) {
    suggestions.push("Consider using dimensions that are powers of 2 (e.g., 256, 512)")
  }

  return {
    isValid: true,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  }
}

/**
 * Checks if a number is a power of 2
 */
function isPowerOf2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

/**
 * Gets the optimal preprocessing options for a specific model
 */
export function getOptimalPreprocessingOptions(
  modelConfig: OnnxModelConfig
): {
  targetWidth: number
  targetHeight: number
  mean: number[]
  std: number[]
  maintainAspectRatio: boolean
  padding: boolean
  paddingColor: [number, number, number]
  interpolation: 'nearest' | 'bilinear' | 'bicubic'
  outputFormat: 'nchw' | 'nhwc'
} {
  // NHWC 형식: [batch, height, width, channels]
  const [_, height, width, __] = modelConfig.inputShape
  
  // AnimeGAN 모델들: 정확한 512x512 필요, 패딩 사용
  if (modelConfig.name.includes('Anime') || modelConfig.name.includes('anime')) {
    return {
      targetWidth: width,
      targetHeight: height,
      mean: modelConfig.mean,
      std: modelConfig.std,
      maintainAspectRatio: true, // 비율 유지하면서 패딩으로 정사각형 만들기
      padding: true, // 패딩 사용
      paddingColor: [0, 0, 0], // 검은색 패딩
      interpolation: 'bicubic', // 고품질 보간
      outputFormat: 'nhwc' // NHWC 형식 사용
    }
  }
  
  // Van Gogh, Picasso, Cyberpunk: 정확한 512x512 필요, 강제 리사이즈
  if (['van-gogh', 'picasso', 'cyberpunk'].includes(modelConfig.name.toLowerCase())) {
    return {
      targetWidth: width,
      targetHeight: height,
      mean: modelConfig.mean,
      std: modelConfig.std,
      maintainAspectRatio: false, // 정확한 크기로 강제 리사이즈
      padding: false, // 패딩 사용 안함
      paddingColor: [0, 0, 0],
      interpolation: 'bilinear', // 중간 품질 보간
      outputFormat: 'nhwc' // NHWC 형식 사용
    }
  }
  
  // 기본값
  return {
    targetWidth: width,
    targetHeight: height,
    mean: modelConfig.mean,
    std: modelConfig.std,
    maintainAspectRatio: false,
    padding: false,
    paddingColor: [0, 0, 0],
    interpolation: 'bilinear',
    outputFormat: 'nhwc'
  }
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
