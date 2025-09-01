'use client'

import React from 'react'

export interface StyleTransferResult {
  originalImage: string
  styledImage: string | null
  processingTime: number | null
  error: string | null
}

interface StyleTransferResultProps {
  result: StyleTransferResult
  originalPreviewUrl: string
}

export function StyleTransferResult({ result, originalPreviewUrl }: StyleTransferResultProps) {
  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Style Transfer Result</h3>
        {result.processingTime && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            ✅ {result.processingTime}ms
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Image */}
        <div>
          <h4 className="text-lg font-medium text-gray-700 mb-3">Original</h4>
          <div className="relative">
            {originalPreviewUrl ? (
              <img
                src={originalPreviewUrl}
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
          <h4 className="text-lg font-medium text-gray-700 mb-3">Styled</h4>
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

      {/* Error Message */}
      {result.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="font-medium text-red-800">Error:</div>
          <div className="text-sm text-red-600 mt-1">{result.error}</div>
        </div>
      )}
    </div>
  )
}
