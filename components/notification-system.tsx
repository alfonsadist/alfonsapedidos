"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

export type NotificationType = "success" | "error" | "info" | "warning"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  autoHide?: boolean
  duration?: number
}

interface NotificationSystemProps {
  notifications: Notification[]
  onRemove: (id: string) => void
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "success":
      return <CheckCircle className="w-5 h-5 text-green-600" />
    case "error":
      return <AlertCircle className="w-5 h-5 text-red-600" />
    case "warning":
      return <AlertCircle className="w-5 h-5 text-orange-600" />
    case "info":
    default:
      return <Info className="w-5 h-5 text-blue-600" />
  }
}

const getNotificationStyles = (type: NotificationType) => {
  switch (type) {
    case "success":
      return "border-green-200 bg-green-50"
    case "error":
      return "border-red-200 bg-red-50"
    case "warning":
      return "border-orange-200 bg-orange-50"
    case "info":
    default:
      return "border-blue-200 bg-blue-50"
  }
}

export function NotificationSystem({ notifications, onRemove }: NotificationSystemProps) {
  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.autoHide !== false) {
        const duration = notification.duration || 5000
        const timer = setTimeout(() => {
          onRemove(notification.id)
        }, duration)

        return () => clearTimeout(timer)
      }
    })
  }, [notifications, onRemove])

  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`border rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out ${getNotificationStyles(
            notification.type,
          )}`}
        >
          <div className="flex items-start gap-3">
            {getNotificationIcon(notification.type)}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
              <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-1">{notification.timestamp.toLocaleTimeString()}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(notification.id)}
              className="h-6 w-6 p-0 hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Hook para manejar notificaciones
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (
    type: NotificationType,
    title: string,
    message: string,
    options?: { autoHide?: boolean; duration?: number },
  ) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      autoHide: options?.autoHide,
      duration: options?.duration,
    }

    setNotifications((prev) => [...prev, notification])
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
  }
}
