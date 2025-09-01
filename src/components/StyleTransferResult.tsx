'use client'

import React from 'react'

import { type StyleTransferResult } from '@/hooks/useStyleTransfer'

interface StyleTransferResultProps {
  result: StyleTransferResult
  onClear: () => void
}

export function StyleTransferResult({ result, onClear }: StyleTransferResultProps) {
  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
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
          <h4 className="text-lg font-medium text-gray-700 mb-3">Original</h4>
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
