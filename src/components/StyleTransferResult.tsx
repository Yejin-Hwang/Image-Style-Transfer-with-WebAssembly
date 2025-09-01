'use client'

import React, { useState, useEffect } from 'react'

import { type StyleTransferResult } from '@/hooks/useStyleTransfer'

interface StyleTransferResultProps {
  result: StyleTransferResult
  onClear: () => void
}

export function StyleTransferResult({ result, onClear }: StyleTransferResultProps) {
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Auto-hide feedback after 3 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  const handleSaveImage = async () => {
    if (!result.styledImage) return
    
    try {
      // Convert data URL to blob
      const response = await fetch(result.styledImage)
      const blob = await response.blob()
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `styled-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setFeedback({ message: 'Image saved successfully!', type: 'success' })
    } catch (error) {
      console.error('Failed to save image:', error)
      setFeedback({ message: 'Failed to save image', type: 'error' })
    }
  }

  const handleCopyLink = async () => {
    if (!result.styledImage) return
    
    try {
      await navigator.clipboard.writeText(result.styledImage)
      setFeedback({ message: 'Link copied to clipboard!', type: 'success' })
    } catch (error) {
      console.error('Failed to copy link:', error)
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = result.styledImage
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setFeedback({ message: 'Link copied to clipboard!', type: 'success' })
      } catch (fallbackError) {
        setFeedback({ message: 'Failed to copy link', type: 'error' })
      }
    }
  }

  const handleSaveOriginal = async () => {
    if (!result.originalImage) return
    
    try {
      // Convert data URL to blob
      const response = await fetch(result.originalImage)
      const blob = await response.blob()
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `original-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setFeedback({ message: 'Original image saved successfully!', type: 'success' })
    } catch (error) {
      console.error('Failed to save original image:', error)
      setFeedback({ message: 'Failed to save original image', type: 'error' })
    }
  }
  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm relative">
      {/* Feedback Toast */}
      {feedback && (
        <div className={`absolute top-2 right-2 px-4 py-2 rounded-md text-sm font-medium z-10 ${
          feedback.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {feedback.message}
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Style Transfer Result</h3>
        <div className="flex items-center gap-3">
          {result.processingTime && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              ✅ {result.processingTime.toFixed(2)}ms
            </span>
          )}
          <button
            onClick={onClear}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Image */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-medium text-gray-700">Original</h4>
            {result.originalImage && (
              <button
                onClick={handleSaveOriginal}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                title="Save Original Image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Save
              </button>
            )}
          </div>
          <div className="relative">
            {result.originalImage ? (
              <img
                src={result.originalImage}
                alt="Original"
                className="w-full max-h-96 object-contain border border-gray-300 rounded-lg bg-gray-50"
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
                <span className="text-gray-500">No original image</span>
              </div>
            )}
          </div>
        </div>

        {/* Styled Image */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-medium text-gray-700">Styled</h4>
            {result.styledImage && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveImage}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                  title="Save Image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Save
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                  title="Copy Link"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Copy
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            {result.styledImage ? (
              <img
                src={result.styledImage}
                alt="Styled"
                className="w-full max-h-96 object-contain border border-gray-300 rounded-lg bg-gray-50"
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">
                    {result.error ? '❌' : '⏳'}
                  </div>
                  <div>
                    {result.error ? 'Processing failed' : 'Processing...'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status and Error Information */}
      <div className="mt-6 space-y-3">
        {/* Processing Status */}
        <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Processing Method:</span>
          <span className="text-sm text-blue-700">
            {result.processingMethod === 'onnx' ? '🚀 ONNX Runtime' : 
             result.processingMethod === 'simulation' ? '🎨 Simulation' : '❌ None'}
          </span>
        </div>

        {/* Status Message */}
        {result.statusMessage && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-700">{result.statusMessage}</div>
          </div>
        )}

        {/* Error Message */}
        {result.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="font-medium text-red-800">Error:</div>
            <div className="text-sm text-red-600 mt-1">{result.error}</div>
          </div>
        )}

        {/* Tensor Debug Info */}
        {result.inputTensor && result.outputTensor && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm font-medium text-green-800 mb-2">🔍 Tensor Debug Info:</div>
            <div className="text-xs text-green-700 space-y-1">
              <div>Input: {result.inputTensor.dims.join('×')} | Range: [{result.inputTensor.dataRange.min.toFixed(3)}, {result.inputTensor.dataRange.max.toFixed(3)}]</div>
              <div>Output: {result.outputTensor.dims.join('×')} | Range: [{result.outputTensor.dataRange.min.toFixed(3)}, {result.outputTensor.dataRange.max.toFixed(3)}]</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
