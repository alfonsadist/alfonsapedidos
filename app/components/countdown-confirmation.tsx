"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X } from "lucide-react"

interface CountdownConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  countdownSeconds?: number
}

export function CountdownConfirmation({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
  onCancel,
  countdownSeconds = 10,
}: CountdownConfirmationProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (open) {
      setTimeLeft(countdownSeconds)
      setIsActive(true)
    } else {
      setIsActive(false)
    }
  }, [open, countdownSeconds])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            // Tiempo agotado, confirmar automáticamente
            setTimeout(() => {
              onConfirm()
              onOpenChange(false)
            }, 100)
            return 0
          }
          return time - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft, onConfirm, onOpenChange])

  const handleCancel = () => {
    setIsActive(false)
    onCancel()
    onOpenChange(false)
  }

  const handleConfirmNow = () => {
    setIsActive(false)
    onConfirm()
    onOpenChange(false)
  }

  const getProgressPercentage = () => {
    return ((countdownSeconds - timeLeft) / countdownSeconds) * 100
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-gray-600">{message}</p>

          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">{timeLeft}</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">Se confirmará automáticamente en {timeLeft} segundos</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button onClick={handleConfirmNow} className="bg-orange-600 hover:bg-orange-700">
            Confirmar Ahora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
