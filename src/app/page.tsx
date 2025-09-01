"use client"
import { useState, useEffect, useCallback } from "react"
import { useImageUpload } from "@/hooks/useImageUpload"
import { useStyleTransfer } from "@/hooks/useStyleTransfer"
import { ImagePreview } from "@/components/ImagePreview"
import { StyleTransferResult } from "@/components/StyleTransferResult"
import { type ImagePreprocessingOptions } from "@/utils/imagePreprocessing"
import { getModelConfig, getOptimalPreprocessingOptions, type OnnxModelConfig } from "@/utils/onnxModels"

export default function Home() {
  const {
    previewUrl,
    preprocessedImage,
    isProcessing,
    error,
    handleFileSelect,
    processImage,
    clearImage,
    validationError
  } = useImageUpload()

  const {
    result: styleTransferResult,
    isTransferring,
    transferStyle,
    clearResult: clearStyleTransferResult
  } = useStyleTransfer()

  const [selectedStyle, setSelectedStyle] = useState("anime")
  const [preprocessingOptions, setPreprocessingOptions] = useState<ImagePreprocessingOptions>({
    targetWidth: 512,
    targetHeight: 512,
    normalize: true,
    maintainAspectRatio: false, // Ensure exact dimensions for ONNX models
    padding: false, // No padding needed when maintaining exact dimensions
    interpolation: 'bilinear'
  })
  const [currentModelConfig, setCurrentModelConfig] = useState<OnnxModelConfig | null>(null)
  


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    handleFileSelect(file)
  }

  const handleProcessImage = async () => {
    console.log('🖼️ Processing image with options:', preprocessingOptions)
    try {
      await processImage(preprocessingOptions)
      console.log('✅ Image processing completed')
    } catch (error) {
      console.error('❌ Image processing failed:', error)
    }
  }

  // Update model configuration when style changes
  useEffect(() => {
    console.log('🎨 Style changed to:', selectedStyle)
    const modelConfig = getModelConfig(selectedStyle)
    setCurrentModelConfig(modelConfig)
    
    if (modelConfig) {
      const optimalOptions = getOptimalPreprocessingOptions(modelConfig)
      console.log('🔧 Optimal preprocessing options:', optimalOptions)
      setPreprocessingOptions(prev => {
        const newOptions = {
          ...prev,
          targetWidth: optimalOptions.targetWidth,
          targetHeight: optimalOptions.targetHeight,
          mean: optimalOptions.mean,
          std: optimalOptions.std,
          maintainAspectRatio: optimalOptions.maintainAspectRatio, // 모델별 맞춤 설정
          padding: optimalOptions.padding, // 모델별 맞춤 설정
          paddingColor: optimalOptions.paddingColor, // 모델별 맞춤 설정
          interpolation: optimalOptions.interpolation, // 모델별 맞춤 설정
          outputFormat: optimalOptions.outputFormat // 모델별 맞춤 설정
        }
        console.log('📐 Updated preprocessing options for', selectedStyle, ':', newOptions)
        return newOptions
      })
    } else {
      console.log('❌ No model config found for style:', selectedStyle)
    }
  }, [selectedStyle])

  // 자동 추론 실행 함수
  const tryRunInference = useCallback(async () => {
    if (!preprocessedImage || !currentModelConfig) return

    try {
      console.log('🚀 Auto-running inference for style:', selectedStyle)
      console.log('📊 Preprocessed image:', preprocessedImage)
      console.log('🔧 Model config:', currentModelConfig)
      console.log('🖼️ Preview URL:', previewUrl)
      
      await transferStyle(preprocessedImage, currentModelConfig, previewUrl || '')
      console.log('✅ Auto-inference completed successfully')
    } catch (error) {
      console.error('❌ Auto-inference failed:', error)
    }
  }, [preprocessedImage, currentModelConfig, selectedStyle, transferStyle, previewUrl])

  // 스타일 변경 시 자동 추론 실행
  useEffect(() => {
    console.log('🔄 useEffect triggered:', {
      selectedStyle,
      hasPreprocessedImage: !!preprocessedImage,
      hasModelConfig: !!currentModelConfig,
      preprocessedImage,
      currentModelConfig
    })
    
    if (preprocessedImage && currentModelConfig) {
      console.log('🎯 Conditions met, calling tryRunInference')
      tryRunInference()
    } else {
      console.log('⏳ Waiting for conditions:', {
        needsPreprocessedImage: !preprocessedImage,
        needsModelConfig: !currentModelConfig
      })
    }
  }, [selectedStyle, preprocessedImage, currentModelConfig, tryRunInference])

  // 이미지 처리 완료 후 자동 추론 실행
  useEffect(() => {
    if (preprocessedImage && currentModelConfig && !styleTransferResult) {
      console.log('🖼️ Image processing completed, triggering auto-inference')
      tryRunInference()
    }
  }, [preprocessedImage, currentModelConfig, styleTransferResult, tryRunInference])

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStyle(e.target.value)
  }



  const handleOptionChange = (key: keyof ImagePreprocessingOptions, value: number | boolean) => {
    setPreprocessingOptions(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Image Style Transfer with WebAssembly
          </h1>
          <p className="text-lg text-gray-600">
            Upload an image and apply artistic styles using ONNX models
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image Upload and Processing */}
          <div className="space-y-6">
            {/* File Upload */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  Select an image file
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    border border-gray-300 rounded-md"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Supported formats: JPG, PNG, WebP, BMP (max 10MB)
                </p>
              </label>
            </div>

            {/* Preprocessing Options */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Preprocessing Options</h2>
              {currentModelConfig && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Model:</strong> {currentModelConfig.name}
                  </p>
                  <p className="text-sm text-blue-700">
                    Optimal input size: {currentModelConfig.inputShape[3]} × {currentModelConfig.inputShape[2]}
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Width
                    </label>
                    <input
                      type="number"
                      value={preprocessingOptions.targetWidth}
                      onChange={(e) => handleOptionChange('targetWidth', parseInt(e.target.value) || 256)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="64"
                      max="1024"
                      step="8"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Height
                    </label>
                    <input
                      type="number"
                      value={preprocessingOptions.targetHeight}
                      onChange={(e) => handleOptionChange('targetHeight', parseInt(e.target.value) || 256)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                      min="64"
                      max="1024"
                      step="8"
                    />
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="normalize"
                    checked={preprocessingOptions.normalize}
                    onChange={(e) => handleOptionChange('normalize', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="normalize" className="ml-2 block text-sm text-gray-700">
                    Normalize with ImageNet mean/std
                  </label>
                </div>

                {currentModelConfig && (
                  <div className="text-xs text-gray-600">
                    <p>Mean: [{preprocessingOptions.mean?.join(', ')}]</p>
                    <p>Std: [{preprocessingOptions.std?.join(', ')}]</p>
                  </div>
                )}
              </div>
            </div>

            {/* Style Selection */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Choose Style</h2>
              <select
                value={selectedStyle}
                onChange={handleStyleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="anime">Anime (Ghibli Style)</option>
                <option value="anime-shinkai">Anime (Shinkai Style)</option>
                <option value="candy">Candy</option>
                <option value="mosaic">Mosaic</option>
                <option value="udnie">Udnie</option>
              </select>
                              <p className="mt-2 text-sm text-gray-600">
                  Select the artistic style to apply to your image
                </p>
                {currentModelConfig && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">
                      📐 {currentModelConfig.name} 전처리 설정
                    </h4>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>• 입력 크기: {currentModelConfig.inputShape[1]}×{currentModelConfig.inputShape[2]}</div>
                      <div>• 정규화: {currentModelConfig.mean[0] === 0.5 ? 'AnimeGAN (-1~1)' : 'ImageNet'}</div>
                      <div>• 비율 유지: {preprocessingOptions.maintainAspectRatio ? '예 (패딩 사용)' : '아니오 (강제 리사이즈)'}</div>
                      <div>• 보간법: {preprocessingOptions.interpolation}</div>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Right Column - Image Preview and Results */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Image Preview & Processing</h2>
              <ImagePreview
                previewUrl={previewUrl}
                preprocessedImage={preprocessedImage}
                isProcessing={isProcessing}
                error={error}
                validationError={validationError}
                onProcess={handleProcessImage}
                onClear={() => {
                  clearImage()
                  clearStyleTransferResult()
                }}
              />
            </div>

            {/* Processing Status */}
            {preprocessedImage && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Ready for Style Transfer</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Image processed:</span>
                    <span className="font-medium text-green-600">✓ Ready</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Style selected:</span>
                    <span className="font-medium">{selectedStyle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model file:</span>
                    <span className="font-medium text-blue-600">
                      {currentModelConfig?.filename || 'Unknown'}
                    </span>
                  </div>
                  {currentModelConfig && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Input shape:</span>
                      <span className="font-medium text-blue-600">
                        {currentModelConfig.inputShape.join(' × ')}
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                      {isTransferring ? (
                        <div className="flex items-center justify-center text-blue-700">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 mr-2"></div>
                          Auto-applying style...
                        </div>
                      ) : (
                        <div className="text-blue-700">
                          <div className="flex items-center justify-center mb-2">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Auto-execution enabled
                          </div>
                          <p className="text-xs">Style will be applied automatically when you change styles</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Style transfer runs automatically when you select a different style
                    </p>
                    
                    {/* Manual trigger button for debugging */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={async () => {
                          console.log('🔧 Manual trigger clicked')
                          if (preprocessedImage && currentModelConfig) {
                            console.log('🎯 Manual execution starting...')
                            await transferStyle(preprocessedImage, currentModelConfig, previewUrl || '')
                          } else {
                            console.log('❌ Manual execution failed - missing requirements')
                          }
                        }}
                        disabled={!preprocessedImage || !currentModelConfig || isTransferring}
                        className="w-full px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        🔧 Manual Trigger (Debug)
                      </button>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        Use this if auto-execution doesn&apos;t work
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Style Transfer Results */}
            {styleTransferResult && (
              <div className="mt-6">
                <StyleTransferResult
                  result={styleTransferResult}
                  onClear={clearStyleTransferResult}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Built with Next.js, WebAssembly, and ONNX models for real-time image style transfer
          </p>
        </div>
      </div>
    </main>
  )
}