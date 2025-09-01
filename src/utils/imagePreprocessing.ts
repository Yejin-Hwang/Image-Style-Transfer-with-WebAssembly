export interface PreprocessedImage {
  data: Float32Array
  width: number
  height: number
  channels: number
  tensorShape: number[] // ONNX tensor shape [batch, height, width, channels]
  normalizationType: 'imagenet' | 'animegan' | 'custom' | 'none'
  mean: number[]
  std: number[]
  dataRange: { min: number; max: number }
}

export interface ImagePreprocessingOptions {
  targetWidth?: number
  targetHeight?: number
  normalize?: boolean
  mean?: number[]
  std?: number[]
  maintainAspectRatio?: boolean
  padding?: boolean
  paddingColor?: [number, number, number] // RGB values for padding
  interpolation?: 'nearest' | 'bilinear' | 'bicubic'
  outputFormat?: 'nhwc' | 'nchw' // ONNX tensor format
}

/**
 * Enhanced Image Preprocessing for ONNX Model Compatibility
 * 
 * Supports multiple model types:
 * - AnimeGAN models: 512x512, NHWC format, -1 to 1 normalization
 * - Fast Neural Style Transfer: 224x224, NCHW format, ImageNet normalization
 * 
 * Key features:
 * - Automatic format detection (NHWC vs NCHW)
 * - Model-specific normalization (ImageNet, AnimeGAN, custom)
 * - Aspect ratio preservation or forced resizing
 * - Quality interpolation options
 * - Comprehensive validation and error handling
 */
export class ImagePreprocessor {
  private static readonly DEFAULT_MEAN = [0.485, 0.456, 0.406] // ImageNet mean
  private static readonly DEFAULT_STD = [0.229, 0.224, 0.225] // ImageNet std
  private static readonly DEFAULT_SIZE = 256 // Common input size for many models

  /**
   * Main preprocessing function that converts an image file to ONNX-compatible format
   */
  static async preprocessImage(
    file: File,
    options: ImagePreprocessingOptions = {}
  ): Promise<PreprocessedImage> {
    try {
      // Create image element and load the file
      const image = await this.loadImageFromFile(file)
      
      // Calculate optimal dimensions
      const { width, height } = this.calculateDimensions(
        image.width,
        image.height,
        options.targetWidth || this.DEFAULT_SIZE,
        options.targetHeight || this.DEFAULT_SIZE,
        options.maintainAspectRatio ?? true
      )
      
      // Resize image with specified interpolation
      const resizedCanvas = this.resizeImage(
        image, 
        width, 
        height, 
        options.interpolation || 'bilinear'
      )
      
      // Apply padding if requested
      const finalCanvas = options.padding 
        ? this.applyPadding(resizedCanvas, options.targetWidth || this.DEFAULT_SIZE, options.targetHeight || this.DEFAULT_SIZE, options.paddingColor)
        : resizedCanvas
      
      // Convert to RGB format and normalize
      const { data, normalizationType, mean, std, dataRange } = this.convertToRGBAndNormalize(
        finalCanvas,
        options.normalize ?? true,
        options.mean || this.DEFAULT_MEAN,
        options.std || this.DEFAULT_STD
      )

      // Determine tensor shape based on output format
      const tensorShape = options.outputFormat === 'nchw' 
        ? [1, 3, height, width] // NCHW format
        : [1, height, width, 3] // NHWC format (default)

      // 🚨 Canvas 크기와 타겟 크기가 다르면 강제로 다시 리사이즈
      const finalWidth = options.targetWidth || this.DEFAULT_SIZE
      const finalHeight = options.targetHeight || this.DEFAULT_SIZE
      
      let actualCanvas = finalCanvas
      if (finalCanvas.width !== finalWidth || finalCanvas.height !== finalHeight) {
        console.warn(`⚠️ Canvas size mismatch! Forcing resize from ${finalCanvas.width}x${finalCanvas.height} to ${finalWidth}x${finalHeight}`)
        actualCanvas = this.forceResize(finalCanvas, finalWidth, finalHeight)
      }
      
      // 강제 리사이즈 후 다시 데이터 추출
      const finalData = actualCanvas !== finalCanvas 
        ? this.convertToRGBAndNormalize(
            actualCanvas,
            options.normalize ?? true,
            options.mean || this.DEFAULT_MEAN,
            options.std || this.DEFAULT_STD
          ).data
        : data
      
      console.log('🔍 Preprocessing - Final dimensions:', {
        originalCanvas: { width: finalCanvas.width, height: finalCanvas.height },
        actualCanvas: { width: actualCanvas.width, height: actualCanvas.height },
        target: { width: finalWidth, height: finalHeight },
        dataLength: finalData.length,
        expectedDataLength: finalWidth * finalHeight * 3,
        tensorShape
      })

      return {
        data: finalData,
        width: finalWidth,
        height: finalHeight,
        channels: 3,
        tensorShape,
        normalizationType,
        mean,
        std,
        dataRange
      }
    } catch (error) {
      throw new Error(`Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Loads an image file into an HTMLImageElement
   */
  private static loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Failed to load image'))
      
      const url = URL.createObjectURL(file)
      image.src = url
      
      // Clean up the object URL after loading
      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve(image)
      }
    })
  }

  /**
   * Calculates optimal dimensions while maintaining aspect ratio
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth: number,
    targetHeight: number,
    maintainAspectRatio: boolean = true
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return { width: targetWidth, height: targetHeight }
    }
    
    const aspectRatio = originalWidth / originalHeight
    const targetAspectRatio = targetWidth / targetHeight

    let finalWidth = targetWidth
    let finalHeight = targetHeight

    if (aspectRatio > targetAspectRatio) {
      // Image is wider than target, fit to width
      finalHeight = Math.round(targetWidth / aspectRatio)
    } else {
      // Image is taller than target, fit to height
      finalWidth = Math.round(targetHeight * aspectRatio)
    }

    return { width: finalWidth, height: finalHeight }
  }

  /**
   * Resizes image to target dimensions using canvas
   */
  private static resizeImage(
    image: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
    interpolation: 'nearest' | 'bilinear' | 'bicubic' = 'bilinear'
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    canvas.width = targetWidth
    canvas.height = targetHeight

    // Configure image smoothing based on interpolation method
    ctx.imageSmoothingEnabled = interpolation !== 'nearest'
    
    if (interpolation === 'bicubic') {
      ctx.imageSmoothingQuality = 'high'
    } else if (interpolation === 'bilinear') {
      ctx.imageSmoothingQuality = 'medium'
    }

    // Draw and resize the image
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

    return canvas
  }

  /**
   * Applies padding to maintain aspect ratio while meeting target dimensions
   */
  private static applyPadding(
    canvas: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number,
    paddingColor: [number, number, number] = [0, 0, 0]
  ): HTMLCanvasElement {
    const paddedCanvas = document.createElement('canvas')
    paddedCanvas.width = targetWidth
    paddedCanvas.height = targetHeight
    
    const ctx = paddedCanvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }
    
    // Fill with padding color
    ctx.fillStyle = `rgb(${paddingColor[0]}, ${paddingColor[1]}, ${paddingColor[2]})`
    ctx.fillRect(0, 0, targetWidth, targetHeight)
    
    // Calculate centering offsets
    const offsetX = (targetWidth - canvas.width) / 2
    const offsetY = (targetHeight - canvas.height) / 2
    
    // Draw the original image centered
    ctx.drawImage(canvas, offsetX, offsetY)
    
    return paddedCanvas
  }

  /**
   * Converts canvas to RGB format and normalizes pixel values
   */
  private static convertToRGBAndNormalize(
    canvas: HTMLCanvasElement,
    normalize: boolean,
    mean: number[],
    std: number[]
  ): { 
    data: Float32Array; 
    normalizationType: 'imagenet' | 'animegan' | 'custom' | 'none';
    mean: number[];
    std: number[];
    dataRange: { min: number; max: number };
  } {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data, width, height } = imageData
    const channels = 3
    const totalPixels = width * height

    // Create output array for normalized RGB data
    const output = new Float32Array(totalPixels * channels)
    
    let minVal = Infinity
    let maxVal = -Infinity
    let normalizationType: 'imagenet' | 'animegan' | 'custom' | 'none' = 'none'

    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i * 4 // RGBA format
      const outputIndex = i * 3 // RGB format

      // Extract RGB values (skip alpha channel)
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]

      if (normalize) {
        // Check if this is AnimeGAN model (using -1~1 range)
        if (mean[0] === 0.5 && std[0] === 0.5) {
          // AnimeGAN normalization: convert to -1~1 range
          output[outputIndex] = (r / 255) * 2 - 1     // Red: 0~1 -> -1~1
          output[outputIndex + 1] = (g / 255) * 2 - 1 // Green: 0~1 -> -1~1
          output[outputIndex + 2] = (b / 255) * 2 - 1 // Blue: 0~1 -> -1~1
          normalizationType = 'animegan'
        } else if (mean[0] === 0.485 && std[0] === 0.229) {
          // Standard ImageNet normalization: (x - mean) / std
          output[outputIndex] = (r / 255 - mean[0]) / std[0]     // Red
          output[outputIndex + 1] = (g / 255 - mean[1]) / std[1] // Green
          output[outputIndex + 2] = (b / 255 - mean[2]) / std[2] // Blue
          normalizationType = 'imagenet'
        } else {
          // Custom normalization
          output[outputIndex] = (r / 255 - mean[0]) / std[0]     // Red
          output[outputIndex + 1] = (g / 255 - mean[1]) / std[1] // Green
          output[outputIndex + 2] = (b / 255 - mean[2]) / std[2] // Blue
          normalizationType = 'custom'
        }
      } else {
        // Just normalize to [0, 1]
        output[outputIndex] = r / 255     // Red
        output[outputIndex + 1] = g / 255 // Green
        output[outputIndex + 2] = b / 255 // Blue
        normalizationType = 'none'
      }
      
      // Track data range for validation
      minVal = Math.min(minVal, output[outputIndex], output[outputIndex + 1], output[outputIndex + 2])
      maxVal = Math.max(maxVal, output[outputIndex], output[outputIndex + 1], output[outputIndex + 2])
    }

    return {
      data: output,
      normalizationType,
      mean,
      std,
      dataRange: { min: minVal, max: maxVal }
    }
  }

  /**
   * Validates if the image file is supported
   */
  static validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'File must be an image' }
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'Image file size must be less than 10MB' }
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!allowedExtensions.includes(fileExtension)) {
      return { isValid: false, error: `Unsupported image format. Supported: ${allowedExtensions.join(', ')}` }
    }

    return { isValid: true }
  }

  /**
   * Validates preprocessed image tensor for ONNX compatibility
   */
  static validatePreprocessedImage(
    preprocessedImage: PreprocessedImage,
    modelConfig: { inputShape: number[]; mean: number[]; std: number[] }
  ): { isValid: boolean; error?: string; warnings?: string[] } {
    const warnings: string[] = []
    
    // Determine if model expects NCHW or NHWC format
    const isNCHW = modelConfig.inputShape.length === 4 && modelConfig.inputShape[1] === 3
    
    let batch: number, channels: number, height: number, width: number
    
    if (isNCHW) {
      // NCHW format: [batch, channels, height, width]
      [batch, channels, height, width] = modelConfig.inputShape
    } else {
      // NHWC format: [batch, height, width, channels]  
      [batch, height, width, channels] = modelConfig.inputShape
    }
    
    // 디버깅: 모든 값 확인
    console.log('🔍 DEBUG VALIDATION:', {
      'modelConfig.inputShape': modelConfig.inputShape,
      'isNCHW': isNCHW,
      'extracted width': width,
      'extracted height': height,
      'preprocessedImage.width': preprocessedImage.width,
      'preprocessedImage.height': preprocessedImage.height,
      'width === preprocessedImage.width': width === preprocessedImage.width,
      'height === preprocessedImage.height': height === preprocessedImage.height
    })
    
    // Check tensor dimensions
    if (preprocessedImage.width !== width || preprocessedImage.height !== height) {
      return { 
        isValid: false, 
        error: `Image dimensions mismatch. Expected: ${width}x${height}, Got: ${preprocessedImage.width}x${preprocessedImage.height}` 
      }
    }
    
    if (preprocessedImage.channels !== channels) {
      return { 
        isValid: false, 
        error: `Channel mismatch. Expected: ${channels}, Got: ${preprocessedImage.channels}` 
      }
    }
    
    // Check data range compatibility
    const { min, max } = preprocessedImage.dataRange
    if (preprocessedImage.normalizationType === 'animegan') {
      if (min < -1.1 || max > 1.1) {
        warnings.push(`Data range (${min.toFixed(3)} to ${max.toFixed(3)}) slightly outside expected -1 to 1 range`)
      }
    } else if (preprocessedImage.normalizationType === 'imagenet') {
      if (min < -3 || max > 3) {
        warnings.push(`Data range (${min.toFixed(3)} to ${max.toFixed(3)}) outside expected ImageNet normalization range`)
      }
    }
    
    // Check tensor shape
    if (preprocessedImage.tensorShape.length !== 4) {
      return { isValid: false, error: 'Invalid tensor shape. Expected 4D tensor [batch, height, width, channels]' }
    }
    
    if (preprocessedImage.tensorShape[0] !== 1) {
      return { isValid: false, error: 'Invalid batch size. Expected batch size of 1' }
    }
    
    return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined }
  }

  /**
   * Creates a preview URL for the uploaded image
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file)
  }

  /**
   * Cleans up preview URLs to prevent memory leaks
   */
  static revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url)
  }

  /**
   * 강제로 Canvas를 정확한 크기로 리사이즈
   */
  private static forceResize(
    sourceCanvas: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    canvas.width = targetWidth
    canvas.height = targetHeight
    
    // 고품질 리사이즈
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight)
    console.log(`🔧 Force resized canvas to ${targetWidth}x${targetHeight}`)
    return canvas
  }
}

/**
 * Convenience function for quick preprocessing with default settings
 */
export const preprocessImage = (
  file: File,
  options?: ImagePreprocessingOptions
): Promise<PreprocessedImage> => {
  return ImagePreprocessor.preprocessImage(file, options)
}

/**
 * Validates image file with helpful error messages
 */
export const validateImageFile = (file: File) => {
  return ImagePreprocessor.validateImageFile(file)
}

/**
 * Creates a preview URL for the uploaded image
 */
export const createPreviewUrl = (file: File): string => {
  return ImagePreprocessor.createPreviewUrl(file)
}

/**
 * Cleans up preview URLs to prevent memory leaks
 */
export const revokePreviewUrl = (url: string): void => {
  ImagePreprocessor.revokePreviewUrl(url)
}
