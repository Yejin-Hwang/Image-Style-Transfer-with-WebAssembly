'use client'

import React from 'react'
import { type PreprocessedImage } from '@/utils/imagePreprocessing'

interface ImagePreviewProps {
  previewUrl?: string
  preprocessedImage?: PreprocessedImage
  isProcessing: boolean
  error?: string
  validationError?: string
  onProcess: () => void
  onClear: () => void
}

export function ImagePreview({ 
  previewUrl, 
  preprocessedImage, 
  isProcessing, 
  error, 
  validationError, 
  onProcess, 
  onClear 
}: ImagePreviewProps) {
  if (!previewUrl) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="mt-4 text-lg">No image selected</p>
        <p className="text-sm">Choose an image file to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {validationError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
          <strong>Validation:</strong> {validationError}
        </div>
      )}

      {/* Image Preview */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Original Image</h3>
            <button
              onClick={onClear}
              disabled={isProcessing}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <img
            src={previewUrl}
            alt="Selected image"
            className="max-w-full max-h-64 object-contain mx-auto border border-gray-200 rounded"
          />
        </div>
      </div>

      {/* Processing Status */}
      <div className="border rounded-lg bg-white p-4">
        <h4 className="font-medium text-gray-900 mb-3">Processing Status</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Image loaded:</span>
            <span className="font-medium text-green-600">✓ Ready</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Preprocessed:</span>
            {preprocessedImage ? (
              <span className="font-medium text-green-600">✓ Complete</span>
            ) : (
              <span className="font-medium text-yellow-600">⏳ Pending</span>
            )}
          </div>
          
          {preprocessedImage && (
            <div className="text-sm text-gray-500 mt-2 p-2 bg-gray-50 rounded">
              <div>Size: {preprocessedImage.width} × {preprocessedImage.height}</div>
              <div>Channels: {preprocessedImage.channels}</div>
              <div>Data length: {preprocessedImage.data.length.toLocaleString()}</div>
            </div>
          )}
        </div>

        {/* Process Button */}
        {!preprocessedImage && !isProcessing && (
          <button
            onClick={onProcess}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Process Image
          </button>
        )}

        {isProcessing && (
          <div className="mt-4 flex items-center justify-center space-x-2 py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-600 font-medium">Processing image...</span>
          </div>
        )}
      </div>
    </div>
  )
}
