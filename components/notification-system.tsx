"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, CheckCircle, AlertCircle, Info, User, Package } from "lucide-react"
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
  icon?: React.ReactNode
}

interface NotificationSystemProps {
  notifications: Notification[]
  onRemove: (id: string) => void
}

const getNotificationIcon = (type: NotificationType, customIcon?: React.ReactNode) => {
  if (customIcon) return customIcon

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
      return "border-green-200 bg-green-50 shadow-green-100"
    case "error":
      return "border-red-200 bg-red-50 shadow-red-100"
    case "warning":
      return "border-orange-200 bg-orange-50 shadow-orange-100"
    case "info":
    default:
      return "border-blue-200 bg-blue-50 shadow-blue-100"
  }
}

export function NotificationSystem({ notifications, onRemove }: NotificationSystemProps) {
  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.autoHide !== false) {
        const duration = notification.duration || 6000
        const timer = setTimeout(() => {
          onRemove(notification.id)
        }, duration)

        return () => clearTimeout(timer)
      }
    })
  }, [notifications, onRemove])

  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.slice(-5).map((notification, index) => (
        <div
          key={notification.id}
          className={`border rounded-lg p-4 shadow-lg transition-all duration-500 ease-in-out transform ${getNotificationStyles(
            notification.type,
          )} ${index === notifications.length - 1 ? "animate-in slide-in-from-right-full" : ""}`}
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <div className="flex items-start gap-3">
            {getNotificationIcon(notification.type, notification.icon)}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 leading-tight">{notification.title}</h4>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <span>•</span>
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(notification.id)}
              className="h-6 w-6 p-0 hover:bg-gray-200 rounded-full flex-shrink-0"
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
    options?: { autoHide?: boolean; duration?: number; icon?: React.ReactNode },
  ) => {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date(),
      autoHide: options?.autoHide,
      duration: options?.duration,
      icon: options?.icon,
    }

    setNotifications((prev) => [...prev, notification])

    // Limitar a máximo 10 notificaciones
    setNotifications((prev) => prev.slice(-10))
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  // Funciones de conveniencia para tipos específicos de notificaciones
  const notifyNewOrder = (clientName: string, createdBy: string) => {
    addNotification("info", "Nuevo Presupuesto", `${createdBy} creó un presupuesto para ${clientName}`, {
      icon: <Package className="w-5 h-5 text-blue-600" />,
      duration: 8000,
    })
  }

  const notifyStatusChange = (clientName: string, status: string, changedBy: string) => {
    addNotification("success", "Estado Actualizado", `${changedBy} actualizó ${clientName} - ${status}`, {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      duration: 7000,
    })
  }

  const notifyUserWorking = (userName: string, clientName: string) => {
    addNotification("info", "Trabajando en Pedido", `${userName} está trabajando en el pedido de ${clientName}`, {
      icon: <User className="w-5 h-5 text-blue-600" />,
      duration: 10000,
    })
  }

  const notifyError = (message: string) => {
    addNotification("error", "Error", message, {
      duration: 8000,
      autoHide: false, // Los errores no se ocultan automáticamente
    })
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    notifyNewOrder,
    notifyStatusChange,
    notifyUserWorking,
    notifyError,
  }
}
