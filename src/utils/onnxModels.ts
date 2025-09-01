export interface OnnxModelConfig {
  name: string
  filename: string
  description: string
  inputShape: [number, number, number, number] // [batch, height, width, channels] - NHWC format
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
    inputShape: [1, 512, 512, 3], // NHWC format: [batch, height, width, channels] - Based on GitHub releases
    mean: [0.5, 0.5, 0.5], // AnimeGAN uses -1~1 range
    std: [0.5, 0.5, 0.5], // AnimeGAN uses -1~1 range
    supportedFormats: ["jpg", "jpeg", "png", "webp"],
    maxInputSize: 512
  },
  "anime-shinkai": {
    name: "Anime (Shinkai Style)",
    filename: "AnimeGANv3_Shinkai_37.onnx",
    description: "Transforms images into Makoto Shinkai anime style",
    inputShape: [1, 512, 512, 3], // NHWC format: [batch, height, width, channels] - Based on GitHub releases
    mean: [0.5, 0.5, 0.5], // AnimeGAN uses -1~1 range
    std: [0.5, 0.5, 0.5], // AnimeGAN uses -1~1 range
    supportedFormats: ["jpg", "jpeg", "png", "webp"],
    maxInputSize: 512
  },
  picasso: {
    name: "Picasso",
    filename: "picasso.onnx",
    description: "Applies Picasso's cubist painting style",
    inputShape: [1, 3, 224, 224], // NHWC format: unify all models to 512x512
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    supportedFormats: ["jpg", "jpeg", "png", "webp"],
    maxInputSize: 512
  },
  "van-gogh": {
    name: "Van Gogh",
    filename: "vangogh.onnx",
    description: "Transforms images into Van Gogh's post-impressionist style",
    inputShape: [1, 512, 512, 3], // NHWC format: unify all models to 512x512
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    supportedFormats: ["jpg", "jpeg", "png", "webp"],
    maxInputSize: 512
  },
  cyberpunk: {
    name: "Cyberpunk",
    filename: "cyberpunk.onnx",
    description: "Applies futuristic cyberpunk aesthetic",
    inputShape: [1, 512, 512, 3], // NHWC format: unify all models to 512x512
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

  // Check dimensions (NHWC format: [batch, height, width, channels])
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
  // NHWC format: [batch, height, width, channels]
  const [_, height, width, __] = modelConfig.inputShape
  
  // AnimeGAN models: require exact 512x512, use padding
  if (modelConfig.name.includes('Anime') || modelConfig.name.includes('anime')) {
    return {
      targetWidth: width,
      targetHeight: height,
      mean: modelConfig.mean,
      std: modelConfig.std,
      maintainAspectRatio: true, // Maintain aspect ratio while creating square with padding
      padding: true, // Use padding
      paddingColor: [0, 0, 0], // Black padding
      interpolation: 'bicubic', // High quality interpolation
      outputFormat: 'nhwc' // Use NHWC format
    }
  }
  
  // Van Gogh, Picasso, Cyberpunk: require exact 512x512, force resize
  if (['van-gogh', 'picasso', 'cyberpunk'].includes(modelConfig.name.toLowerCase())) {
    return {
      targetWidth: width,
      targetHeight: height,
      mean: modelConfig.mean,
      std: modelConfig.std,
      maintainAspectRatio: false, // Force resize to exact dimensions
      padding: false, // Don't use padding
      paddingColor: [0, 0, 0],
      interpolation: 'bilinear', // Medium quality interpolation
      outputFormat: 'nhwc' // Use NHWC format
    }
  }
  
  // Default values
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
