"use client"

import { useEffect, useState } from "react"
import { CheckCircle, X } from "lucide-react"

interface SuccessAlertProps {
  show: boolean
  message: string
  onClose: () => void
}

export function SuccessAlert({ show, message, onClose }: SuccessAlertProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // Esperar a que termine la animación
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div
        className={`bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full transform transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">¡Completado!</h3>
            <p className="text-gray-600">{message}</p>
          </div>

          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(onClose, 300)
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
