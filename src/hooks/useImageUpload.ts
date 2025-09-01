import { useState, useCallback, useEffect } from 'react'
import { 
  preprocessImage, 
  validateImageFile, 
  createPreviewUrl, 
  revokePreviewUrl,
  type PreprocessedImage,
  type ImagePreprocessingOptions 
} from '@/utils/imagePreprocessing'

interface UseImageUploadReturn {
  // State
  selectedFile: File | null
  previewUrl: string | null
  preprocessedImage: PreprocessedImage | null
  isProcessing: boolean
  error: string | null
  
  // Actions
  handleFileSelect: (file: File | null) => void
  processImage: (options?: ImagePreprocessingOptions) => Promise<void>
  clearImage: () => void
  
  // Validation
  isValidFile: boolean
  validationError: string | null
}

export function useImageUpload(): UseImageUploadReturn {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [preprocessedImage, setPreprocessedImage] = useState<PreprocessedImage | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Clean up preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        revokePreviewUrl(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileSelect = useCallback((file: File | null) => {
    // Clear previous state
    clearImage()
    
    if (!file) {
      return
    }

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid file')
      return
    }

    // Clear validation errors
    setValidationError(null)
    setError(null)
    
    // Set file and create preview
    setSelectedFile(file)
    const url = createPreviewUrl(file)
    setPreviewUrl(url)
  }, [])

  const processImage = useCallback(async (options?: ImagePreprocessingOptions) => {
    if (!selectedFile) {
      setError('No file selected')
      return
    }

    try {
      setIsProcessing(true)
      setError(null)
      
      // Enhanced preprocessing with model-specific options
      const enhancedOptions: ImagePreprocessingOptions = {
        maintainAspectRatio: true,
        padding: true,
        paddingColor: [0, 0, 0], // Black padding
        interpolation: 'bicubic', // High-quality interpolation
        outputFormat: 'nhwc', // ONNX standard format
        ...options
      }
      
      const processed = await preprocessImage(selectedFile, enhancedOptions)
      
      // Log preprocessing details for debugging
      console.log('Image preprocessing completed:', {
        originalFile: selectedFile.name,
        dimensions: `${processed.width}x${processed.height}`,
        tensorShape: processed.tensorShape,
        normalizationType: processed.normalizationType,
        dataRange: processed.dataRange,
        mean: processed.mean,
        std: processed.std
      })
      
      setPreprocessedImage(processed)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process image'
      setError(errorMessage)
      console.error('Image processing error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [selectedFile])

  const clearImage = useCallback(() => {
    if (previewUrl) {
      revokePreviewUrl(previewUrl)
    }
    
    setSelectedFile(null)
    setPreviewUrl(null)
    setPreprocessedImage(null)
    setError(null)
    setValidationError(null)
  }, [previewUrl])

  const isValidFile = selectedFile !== null && validationError === null

  return {
    // State
    selectedFile,
    previewUrl,
    preprocessedImage,
    isProcessing,
    error,
    
    // Actions
    handleFileSelect,
    processImage,
    clearImage,
    
    // Validation
    isValidFile,
    validationError
  }
}
