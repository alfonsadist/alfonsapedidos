"use client"

import { AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmText: string
  onConfirm: () => void
  variant?: "default" | "destructive"
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmText,
  onConfirm,
  variant = "default",
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                variant === "destructive" ? "bg-red-100" : "bg-blue-100"
              }`}
            >
              <AlertTriangle className={`w-5 h-5 ${variant === "destructive" ? "text-red-600" : "text-blue-600"}`} />
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-gray-600">{message}</p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant={variant === "destructive" ? "destructive" : "default"} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
