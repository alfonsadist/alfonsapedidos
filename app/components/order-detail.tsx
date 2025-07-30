"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Package,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Truck,
  Copy,
  Edit3,
  Save,
  X,
  FileText,
  Plus,
  Trash2,
  Clock,
} from "lucide-react"
import { UserIcon } from "lucide-react"
import type { Order, User, HistoryEntry, OrderStatus, Product } from "../page"
import { SuccessAlert } from "./success-alert"
import { ConfirmationDialog } from "./confirmation-dialog"
import { CountdownConfirmation } from "./countdown-confirmation"

interface OrderDetailProps {
  order: Order
  currentUser: User
  onClose: () => void
  onUpdateOrder: (order: Order) => void
  onSetWorking?: (orderId: string) => void
  onClearWorking?: (orderId: string) => void
}

const STATUS_CONFIG = {
  en_armado: {
    label: "En Armado",
    color: "bg-blue-500",
    icon: Package,
  },
  armado: {
    label: "Armado",
    color: "bg-green-500",
    icon: CheckCircle,
  },
  armado_controlado: {
    label: "Armado Controlado",
    color: "bg-purple-500",
    icon: CheckCircle,
  },
  facturado: {
    label: "Facturado",
    color: "bg-orange-500",
    icon: DollarSign,
  },
  factura_controlada: {
    label: "Factura Controlada",
    color: "bg-yellow-500",
    icon: DollarSign,
  },
  en_transito: {
    label: "En Tránsito",
    color: "bg-sky-500",
    icon: Truck,
  },
  entregado: {
    label: "Entregado",
    color: "bg-slate-500",
    icon: CheckCircle,
  },
  pagado: {
    label: "Pagado",
    color: "bg-emerald-500",
    icon: CheckCircle,
  },
}

export function OrderDetail({
  order,
  currentUser,
  onClose,
  onUpdateOrder,
  onSetWorking,
  onClearWorking,
}: OrderDetailProps) {
  const [notes, setNotes] = useState("")
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState<number>(0)
  const [showMissing, setShowMissing] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [copyMessage, setCopyMessage] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    action: () => void
    title: string
    message: string
    confirmText: string
  } | null>(null)

  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownAction, setCountdownAction] = useState<{
    action: () => void
    title: string
    message: string
  } | null>(null)

  // Estado local para manejar cambios temporales durante el armado
  const [localProducts, setLocalProducts] = useState(order.products)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Verificar si alguien más está trabajando en el pedido (solo para armadores)
  const isBeingWorkedOnByOther =
    order.currentlyWorkingBy && order.currentlyWorkingBy !== currentUser.name && currentUser.role === "armador"

  // Función para marcar que está trabajando (solo al empezar a armar)
  const startWorking = () => {
    if (currentUser.role === "armador" && onSetWorking) {
      onSetWorking(order.id)
    }
  }

  // Función para limpiar el estado de trabajo
  const stopWorking = () => {
    if (currentUser.role === "armador" && onClearWorking) {
      onClearWorking(order.id)
    }
  }

  // Sincronizar estado local cuando cambia la orden
  useEffect(() => {
    // Si estamos en modo control (armado o facturado), resetear los checkboxes
    if (
      (order.status === "armado" && currentUser.role === "armador" && order.armedBy !== currentUser.name) ||
      (order.status === "facturado" && currentUser.role === "armador")
    ) {
      setLocalProducts(order.products.map((p) => ({ ...p, isChecked: false })))
    } else {
      setLocalProducts(order.products)
    }
    setHasUnsavedChanges(false)
  }, [order.products, order.status, currentUser.name, currentUser.role, order.armedBy])

  // Obtener el tiempo que alguien lleva trabajando
  const getWorkingTime = () => {
    if (!order.workingStartTime) return ""
    const now = new Date()
    const diff = now.getTime() - order.workingStartTime.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  }

  const addHistoryEntry = (action: string, notes?: string): HistoryEntry => ({
    id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action,
    user: currentUser.name,
    timestamp: new Date(),
    notes,
  })

  const updateOrderStatus = (newStatus: OrderStatus, action: string, additionalData?: Partial<Order>) => {
    const updatedOrder: Order = {
      ...order,
      ...additionalData,
      status: newStatus,
      history: [...order.history, addHistoryEntry(action, notes || undefined)],
    }

    onUpdateOrder(updatedOrder)
    setNotes("")

    // Cerrar el diálogo y regresar al inicio
    setTimeout(() => {
      onClose()
    }, 500)
  }

  const updateLocalProductQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 0) {
      alert("La cantidad no puede ser negativa")
      setEditingProduct(null)
      setEditQuantity(0)
      return
    }

    // Actualizar solo el estado local, no la orden principal
    const updatedLocalProducts = localProducts.map((p) => (p.id === productId ? { ...p, quantity: newQuantity } : p))

    setLocalProducts(updatedLocalProducts)
    setHasUnsavedChanges(true)
    setEditingProduct(null)
    setEditQuantity(0)
  }

  const toggleLocalProductCheck = (productId: string) => {
    const updatedLocalProducts = localProducts.map((p) => (p.id === productId ? { ...p, isChecked: !p.isChecked } : p))

    setLocalProducts(updatedLocalProducts)
    setHasUnsavedChanges(true)
  }

  // Agregar producto (solo para Vale en estado en_armado)
  const addProduct = () => {
    const newProduct: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      quantity: 1,
      originalQuantity: 1,
      isChecked: false,
    }
    setLocalProducts([...localProducts, newProduct])
    setHasUnsavedChanges(true)
  }

  // Remover producto (solo para Vale en estado en_armado)
  const removeProduct = (productId: string) => {
    if (localProducts.length <= 1) {
      alert("Debe haber al menos un producto")
      return
    }
    setLocalProducts(localProducts.filter((p) => p.id !== productId))
    setHasUnsavedChanges(true)
  }

  // Actualizar nombre de producto (solo para Vale en estado en_armado)
  const updateProductName = (productId: string, name: string) => {
    const updatedLocalProducts = localProducts.map((p) => (p.id === productId ? { ...p, name } : p))
    setLocalProducts(updatedLocalProducts)
    setHasUnsavedChanges(true)
  }

  // Actualizar código de producto (solo para Vale en estado en_armado)
  const updateProductCode = (productId: string, code: string) => {
    const updatedLocalProducts = localProducts.map((p) => (p.id === productId ? { ...p, code } : p))
    setLocalProducts(updatedLocalProducts)
    setHasUnsavedChanges(true)
  }

  // Guardar cambios de Vale en presupuesto
  const savePresupuestoChanges = () => {
    const validProducts = localProducts.filter((p) => p.name.trim() && p.quantity > 0)
    if (validProducts.length === 0) {
      alert("Debe haber al menos un producto válido")
      return
    }

    const updatedMissingProducts = [...order.missingProducts]
    const historyEntries = []

    // Si estamos facturando (armado_controlado), recalcular faltantes automáticamente
    if (order.status === "armado_controlado") {
      // Recalcular faltantes basándose en las cantidades actualizadas
      for (const localProduct of validProducts) {
        const originalQuantity = localProduct.originalQuantity || 0
        const newQuantity = localProduct.quantity
        const expectedMissing = Math.max(0, originalQuantity - newQuantity)

        // Buscar si este producto tenía faltantes previos
        const existingMissingIndex = updatedMissingProducts.findIndex((m) => m.productId === localProduct.id)

        if (expectedMissing > 0) {
          // Debería haber faltantes
          if (existingMissingIndex >= 0) {
            // Actualizar faltantes existentes
            const previousMissing = updatedMissingProducts[existingMissingIndex].quantity
            updatedMissingProducts[existingMissingIndex].quantity = expectedMissing

            if (previousMissing !== expectedMissing) {
              if (expectedMissing < previousMissing) {
                historyEntries.push(
                  addHistoryEntry(
                    `Faltantes reducidos: ${localProduct.name} de ${previousMissing} a ${expectedMissing} (se encontraron ${previousMissing - expectedMissing})`,
                  ),
                )
              } else {
                historyEntries.push(
                  addHistoryEntry(
                    `Faltantes aumentados: ${localProduct.name} de ${previousMissing} a ${expectedMissing}`,
                  ),
                )
              }
            }
          } else {
            // Agregar nuevos faltantes (caso raro, pero posible)
            updatedMissingProducts.push({
              productId: localProduct.id,
              productName: localProduct.name,
              code: localProduct.code,
              quantity: expectedMissing,
            })
            historyEntries.push(
              addHistoryEntry(`Nuevos faltantes detectados: ${localProduct.name} - ${expectedMissing}`),
            )
          }
        } else {
          // No debería haber faltantes
          if (existingMissingIndex >= 0) {
            // Eliminar faltantes que ya no aplican
            const previousMissing = updatedMissingProducts[existingMissingIndex].quantity
            updatedMissingProducts.splice(existingMissingIndex, 1)
            historyEntries.push(
              addHistoryEntry(
                `Faltantes eliminados: ${localProduct.name} - se encontraron todos los ${previousMissing} faltantes`,
              ),
            )
          }
        }
      }
    }

    const updatedOrder: Order = {
      ...order,
      products: validProducts.map((p) => ({
        ...p,
        originalQuantity: order.status === "en_armado" ? p.quantity : p.originalQuantity, // Solo actualizar originalQuantity si estamos editando presupuesto
        isChecked: false,
      })),
      missingProducts: updatedMissingProducts, // Aplicar los faltantes recalculados
      history: [
        ...order.history,
        ...historyEntries, // Agregar entradas del historial de cambios en faltantes
        addHistoryEntry(
          order.status === "armado_controlado"
            ? "Factura actualizada - productos y faltantes recalculados"
            : "Presupuesto actualizado",
          notes || undefined,
        ),
      ],
    }

    onUpdateOrder(updatedOrder)
    setNotes("")
    setHasUnsavedChanges(false)

    setSuccessMessage(
      order.status === "armado_controlado"
        ? "Factura actualizada - faltantes recalculados automáticamente"
        : "Presupuesto actualizado correctamente",
    )
    setShowSuccessAlert(true)
  }

  const confirmArmado = () => {
    startWorking() // Marcar como trabajando al empezar a armar
    // Calcular faltantes basado en los productos locales marcados
    const missingProducts = []
    const historyEntries = []

    for (const localProduct of localProducts) {
      if (localProduct.isChecked && localProduct.originalQuantity) {
        const difference = localProduct.originalQuantity - localProduct.quantity

        if (difference > 0) {
          missingProducts.push({
            productId: localProduct.id,
            productName: localProduct.name,
            code: localProduct.code,
            quantity: difference,
          })
        }

        // Agregar entrada al historial si hubo cambio de cantidad
        if (localProduct.originalQuantity !== localProduct.quantity) {
          historyEntries.push(
            addHistoryEntry(
              `Cantidad actualizada: ${localProduct.name} de ${localProduct.originalQuantity} a ${localProduct.quantity}${
                difference > 0 ? ` (${difference} faltantes)` : ""
              }`,
            ),
          )
        }
      }
    }

    // Actualizar la orden con todos los cambios
    const updatedOrder: Order = {
      ...order,
      products: localProducts,
      missingProducts: [...order.missingProducts, ...missingProducts],
      status: "armado",
      armedBy: currentUser.name,
      currentlyWorkingBy: undefined, // Limpiar el estado de trabajo
      workingStartTime: undefined,
      history: [...order.history, ...historyEntries, addHistoryEntry("Pedido armado", notes || undefined)],
    }

    stopWorking() // Limpiar estado al terminar

    onUpdateOrder(updatedOrder)
    setNotes("")
    setHasUnsavedChanges(false)

    // Mostrar alert de éxito y cerrar
    setSuccessMessage("Pedido armado correctamente")
    setShowSuccessAlert(true)
    setTimeout(() => {
      onClose()
    }, 2000)
  }

  const cancelChanges = () => {
    // Si estamos en modo control, resetear checkboxes
    if (
      (order.status === "armado" && currentUser.role === "armador" && order.armedBy !== currentUser.name) ||
      (order.status === "facturado" && currentUser.role === "armador")
    ) {
      setLocalProducts(order.products.map((p) => ({ ...p, isChecked: false })))
    } else {
      setLocalProducts(order.products)
    }
    setHasUnsavedChanges(false)
    setEditingProduct(null)
    setEditQuantity(0)
  }

  const copyMissingProducts = () => {
    const missingText = order.missingProducts
      .map((m) => `${m.code ? `${m.code} - ` : ""}${m.productName}: ${m.quantity}`)
      .join("\n")

    navigator.clipboard.writeText(missingText).then(() => {
      setCopyMessage("Faltantes copiados")
      setTimeout(() => setCopyMessage(""), 2000)
    })
  }

  const copyInvoiceSummary = () => {
    const finalProducts = order.products.filter((p) => p.quantity > 0)
    const invoiceText = [
      `RESUMEN DE FACTURA - ${order.clientName}`,
      `Fecha: ${order.createdAt.toLocaleDateString()}`,
      "",
      "PRODUCTOS:",
      ...finalProducts.map((p) => `${p.code ? `${p.code} - ` : ""}${p.name}: ${p.quantity}`),
      "",
      ...(order.missingProducts.length > 0 ? ["FALTANTES:"] : []),
      ...order.missingProducts.map((m) => `${m.code ? `${m.code} - ` : ""}${m.productName}: ${m.quantity}`),
    ]
      .filter((line) => line !== "")
      .join("\n")

    navigator.clipboard.writeText(invoiceText).then(() => {
      setCopyMessage("Resumen de factura copiado")
      setTimeout(() => setCopyMessage(""), 2000)
    })
  }

  const canUserPerformAction = (action: string) => {
    // Si alguien más está trabajando en el pedido, no permitir acciones
    if (isBeingWorkedOnByOther) return false

    switch (action) {
      case "arm":
        return currentUser.role === "armador" && order.status === "en_armado"
      case "control_armed":
        return currentUser.role === "armador" && order.status === "armado" && order.armedBy !== currentUser.name
      case "invoice":
        return currentUser.role === "vale" && order.status === "armado_controlado"
      case "control_invoice":
        return currentUser.role === "armador" && order.status === "facturado"
      case "transit":
        return currentUser.role === "armador" && order.status === "factura_controlada"
      case "deliver":
        return currentUser.role === "armador" && order.status === "en_transito"
      case "pay_cash":
        return currentUser.role === "armador" && order.status === "entregado" && !order.isPaid
      case "pay_transfer":
        return order.status === "entregado" && !order.isPaid
      case "verify_transfer":
        return currentUser.role === "vale" && order.awaitingPaymentVerification
      case "edit_products":
        return (
          (currentUser.role === "armador" &&
            (order.status === "en_armado" ||
              (order.status === "armado" && order.armedBy !== currentUser.name) ||
              order.status === "facturado" ||
              order.status === "en_transito")) ||
          (currentUser.role === "vale" && (order.status === "facturado" || order.status === "en_armado"))
        )
      case "edit_presupuesto":
        return currentUser.role === "vale" && (order.status === "en_armado" || order.status === "armado_controlado")
      default:
        return false
    }
  }

  const confirmControlArmado = () => {
    startWorking() // Marcar como trabajando al empezar control
    // Calcular faltantes basado en los productos locales marcados durante el control
    const missingProducts = [...order.missingProducts] // Mantener faltantes existentes
    const historyEntries = []

    for (const localProduct of localProducts) {
      if (localProduct.isChecked && localProduct.originalQuantity) {
        const difference = localProduct.originalQuantity - localProduct.quantity
        const originalProduct = order.products.find((p) => p.id === localProduct.id)

        // Si hubo cambio de cantidad durante el control
        if (originalProduct && originalProduct.quantity !== localProduct.quantity) {
          // Actualizar o agregar faltante
          const existingMissingIndex = missingProducts.findIndex((m) => m.productId === localProduct.id)

          if (difference > 0) {
            if (existingMissingIndex >= 0) {
              missingProducts[existingMissingIndex].quantity = difference
            } else {
              missingProducts.push({
                productId: localProduct.id,
                productName: localProduct.name,
                code: localProduct.code,
                quantity: difference,
              })
            }
          } else {
            // Si no hay diferencia, remover de faltantes si existía
            if (existingMissingIndex >= 0) {
              missingProducts.splice(existingMissingIndex, 1)
            }
          }

          historyEntries.push(
            addHistoryEntry(
              `Control: ${localProduct.name} ajustado de ${originalProduct.quantity} a ${localProduct.quantity}${
                difference > 0
                  ? ` (${difference} faltantes)`
                  : difference < 0
                    ? ` (${Math.abs(difference)} extras encontrados)`
                    : " (sin faltantes)"
              }`,
            ),
          )
        }
      }
    }

    // Actualizar la orden con todos los cambios del control
    const updatedOrder: Order = {
      ...order,
      products: localProducts,
      missingProducts: missingProducts,
      status: "armado_controlado",
      controlledBy: currentUser.name,
      currentlyWorkingBy: undefined, // Limpiar el estado de trabajo
      workingStartTime: undefined,
      history: [...order.history, ...historyEntries, addHistoryEntry("Armado controlado", notes || undefined)],
    }

    stopWorking() // Limpiar al terminar

    onUpdateOrder(updatedOrder)
    setNotes("")
    setHasUnsavedChanges(false)

    // Mostrar alert de éxito y cerrar
    setSuccessMessage("Control del armado realizado")
    setShowSuccessAlert(true)
    setTimeout(() => {
      onClose()
    }, 2000)
  }

  const confirmControlFactura = () => {
    startWorking() // Marcar como trabajando al empezar control
    // Similar al control de armado pero para facturas
    const missingProducts = [...order.missingProducts]
    const historyEntries = []

    for (const localProduct of localProducts) {
      if (localProduct.isChecked && localProduct.originalQuantity) {
        const difference = localProduct.originalQuantity - localProduct.quantity
        const originalProduct = order.products.find((p) => p.id === localProduct.id)

        if (originalProduct && originalProduct.quantity !== localProduct.quantity) {
          const existingMissingIndex = missingProducts.findIndex((m) => m.productId === localProduct.id)

          if (difference > 0) {
            if (existingMissingIndex >= 0) {
              missingProducts[existingMissingIndex].quantity = difference
            } else {
              missingProducts.push({
                productId: localProduct.id,
                productName: localProduct.name,
                code: localProduct.code,
                quantity: difference,
              })
            }
          } else {
            if (existingMissingIndex >= 0) {
              missingProducts.splice(existingMissingIndex, 1)
            }
          }

          historyEntries.push(
            addHistoryEntry(
              `Control factura: ${localProduct.name} ajustado de ${originalProduct.quantity} a ${localProduct.quantity}${
                difference > 0
                  ? ` (${difference} faltantes)`
                  : difference < 0
                    ? ` (${Math.abs(difference)} extras encontrados)`
                    : " (sin faltantes)"
              }`,
            ),
          )
        }
      }
    }

    const updatedOrder: Order = {
      ...order,
      products: localProducts,
      missingProducts: missingProducts,
      status: "factura_controlada",
      currentlyWorkingBy: undefined, // Limpiar el estado de trabajo
      workingStartTime: undefined,
      history: [...order.history, ...historyEntries, addHistoryEntry("Factura controlada", notes || undefined)],
    }

    stopWorking() // Limpiar al terminar

    onUpdateOrder(updatedOrder)
    setNotes("")
    setHasUnsavedChanges(false)

    setSuccessMessage("Control de factura realizado")
    setShowSuccessAlert(true)
    setTimeout(() => {
      onClose()
    }, 2000)
  }

  const confirmDelivery = () => {
    // Calcular productos devueltos basado en los productos locales
    const returnedProducts = []
    const historyEntries = []

    for (const localProduct of localProducts) {
      if (localProduct.isChecked && localProduct.originalQuantity) {
        const difference = localProduct.originalQuantity - localProduct.quantity
        const originalProduct = order.products.find((p) => p.id === localProduct.id)

        if (originalProduct && originalProduct.quantity !== localProduct.quantity && difference > 0) {
          returnedProducts.push({
            productId: localProduct.id,
            productName: localProduct.name,
            code: localProduct.code,
            quantity: difference,
            reason: "Devuelto por el cliente en la entrega",
          })

          historyEntries.push(
            addHistoryEntry(`Entrega: ${localProduct.name} - ${difference} unidades devueltas por el cliente`),
          )
        }
      }
    }

    const updatedOrder: Order = {
      ...order,
      products: localProducts,
      returnedProducts: [...order.returnedProducts, ...returnedProducts],
      status: "entregado",
      currentlyWorkingBy: undefined, // Limpiar el estado de trabajo
      workingStartTime: undefined,
      history: [...order.history, ...historyEntries, addHistoryEntry("Pedido entregado", notes || undefined)],
    }

    onUpdateOrder(updatedOrder)
    setNotes("")
    setHasUnsavedChanges(false)

    setSuccessMessage("Pedido marcado como entregado")
    setShowSuccessAlert(true)
    setTimeout(() => {
      onClose()
    }, 2000)
  }

  const handleActionWithCountdown = (action: () => void, title: string, message: string) => {
    setCountdownAction({ action, title, message })
    setShowCountdown(true)
  }

  const getAvailableActions = () => {
    const actions = []

    // Si alguien más está trabajando, mostrar mensaje
    if (isBeingWorkedOnByOther) {
      return [
        {
          label: `${order.currentlyWorkingBy} está trabajando (${getWorkingTime()})`,
          action: () => {},
          variant: "outline" as const,
          disabled: true,
        },
      ]
    }

    // Lógica para editar presupuesto (Vale en estado en_armado)
    if (canUserPerformAction("edit_presupuesto") && hasUnsavedChanges) {
      actions.push({
        label: order.status === "armado_controlado" ? "Guardar Cambios en Factura" : "Guardar Cambios",
        action: () =>
          handleActionWithCountdown(
            savePresupuestoChanges,
            order.status === "armado_controlado" ? "Guardar Cambios en Factura" : "Guardar Cambios",
            order.status === "armado_controlado"
              ? "¿Estás seguro de que quieres guardar los cambios en la factura?"
              : "¿Estás seguro de que quieres guardar los cambios en el presupuesto?",
          ),
        variant: "default" as const,
        disabled: false,
      })

      actions.push({
        label: "Cancelar Cambios",
        action: cancelChanges,
        variant: "outline" as const,
        disabled: false,
      })
    }

    // Lógica para armado
    if (canUserPerformAction("arm")) {
      const allChecked = localProducts.every((p) => p.isChecked)
      const hasProducts = localProducts.length > 0
      const uncheckedCount = localProducts.filter((p) => !p.isChecked).length

      if (hasUnsavedChanges) {
        actions.push({
          label: allChecked ? "Confirmar Armado" : `Faltan marcar ${uncheckedCount} productos`,
          action: () =>
            handleActionWithCountdown(
              confirmArmado,
              "Confirmar Armado",
              "¿Estás seguro de que quieres confirmar el armado del pedido?",
            ),
          variant: "default" as const,
          disabled: !allChecked || !hasProducts,
        })

        actions.push({
          label: "Cancelar Cambios",
          action: cancelChanges,
          variant: "outline" as const,
          disabled: false,
        })
      } else {
        actions.push({
          label: allChecked ? "Confirmar Armado" : `Faltan marcar ${uncheckedCount} productos`,
          action: () =>
            handleActionWithCountdown(
              confirmArmado,
              "Confirmar Armado",
              "¿Estás seguro de que quieres confirmar el armado del pedido?",
            ),
          variant: "default" as const,
          disabled: !allChecked || !hasProducts,
        })
      }
    }

    // Lógica para control de armado
    if (canUserPerformAction("control_armed")) {
      const allChecked = localProducts.every((p) => p.isChecked)
      const hasProducts = localProducts.length > 0
      const uncheckedCount = localProducts.filter((p) => !p.isChecked).length

      if (hasUnsavedChanges) {
        actions.push({
          label: allChecked ? "Confirmar Control" : `Faltan controlar ${uncheckedCount} productos`,
          action: () =>
            handleActionWithCountdown(
              confirmControlArmado,
              "Confirmar Control",
              "¿Estás seguro de que quieres confirmar el control del armado?",
            ),
          variant: "default" as const,
          disabled: !allChecked || !hasProducts,
        })

        actions.push({
          label: "Cancelar Cambios",
          action: cancelChanges,
          variant: "outline" as const,
          disabled: false,
        })
      } else {
        actions.push({
          label: allChecked ? "Confirmar Control" : `Faltan controlar ${uncheckedCount} productos`,
          action: () =>
            handleActionWithCountdown(
              confirmControlArmado,
              "Confirmar Control",
              "¿Estás seguro de que quieres confirmar el control del armado?",
            ),
          variant: "default" as const,
          disabled: !allChecked || !hasProducts,
        })
      }
    }

    // Lógica para control de factura
    if (canUserPerformAction("control_invoice")) {
      const allChecked = localProducts.every((p) => p.isChecked)
      const hasProducts = localProducts.length > 0
      const uncheckedCount = localProducts.filter((p) => !p.isChecked).length

      if (hasUnsavedChanges) {
        actions.push({
          label: allChecked ? "Confirmar Control Factura" : `Faltan controlar ${uncheckedCount} productos`,
          action: () =>
            handleActionWithCountdown(
              confirmControlFactura,
              "Confirmar Control de Factura",
              "¿Estás seguro de que quieres confirmar el control de la factura?",
            ),
          variant: "default" as const,
          disabled: !allChecked || !hasProducts,
        })

        actions.push({
          label: "Cancelar Cambios",
          action: cancelChanges,
          variant: "outline" as const,
          disabled: false,
        })
      } else {
        actions.push({
          label: allChecked ? "Confirmar Control Factura" : `Faltan controlar ${uncheckedCount} productos`,
          action: () =>
            handleActionWithCountdown(
              confirmControlFactura,
              "Confirmar Control de Factura",
              "¿Estás seguro de que quieres confirmar el control de la factura?",
            ),
          variant: "default" as const,
          disabled: !allChecked || !hasProducts,
        })
      }
    }

    // Resto de acciones con confirmación...
    if (canUserPerformAction("invoice")) {
      actions.push({
        label: "Marcar como Facturado",
        action: () =>
          handleActionWithCountdown(
            () => updateOrderStatus("facturado", "Pedido facturado"),
            "Marcar como Facturado",
            "¿Estás seguro de que quieres marcar este pedido como facturado?",
          ),
        variant: "default" as const,
      })
    }

    if (canUserPerformAction("transit")) {
      actions.push({
        label: "Marcar En Tránsito",
        action: () =>
          handleActionWithCountdown(
            () => updateOrderStatus("en_transito", "Pedido en tránsito"),
            "Marcar En Tránsito",
            "¿Estás seguro de que quieres marcar este pedido en tránsito?",
          ),
        variant: "default" as const,
      })
    }

    // Lógica para entrega con modificaciones
    if (canUserPerformAction("deliver")) {
      const allChecked = localProducts.every((p) => p.isChecked)
      const hasProducts = localProducts.length > 0
      const uncheckedCount = localProducts.filter((p) => !p.isChecked).length

      if (hasUnsavedChanges) {
        actions.push({
          label: allChecked ? "Confirmar Entrega" : `Faltan marcar ${uncheckedCount} productos`,
          action: () =>
            handleActionWithCountdown(
              confirmDelivery,
              "Confirmar Entrega",
              "Se marcará como entregado. Los productos reducidos se registrarán como devueltos por el cliente.",
            ),
          variant: "default" as const,
          disabled: !allChecked || !hasProducts,
        })

        actions.push({
          label: "Cancelar Cambios",
          action: cancelChanges,
          variant: "outline" as const,
          disabled: false,
        })
      } else {
        actions.push({
          label: "Marcar como Entregado",
          action: () =>
            handleActionWithCountdown(
              () => updateOrderStatus("entregado", "Pedido entregado"),
              "Marcar como Entregado",
              "¿Estás seguro de que quieres marcar este pedido como entregado?",
            ),
          variant: "default" as const,
        })
      }
    }

    if (canUserPerformAction("pay_cash")) {
      actions.push({
        label: "Pago en Efectivo",
        action: () =>
          handleActionWithCountdown(
            () =>
              updateOrderStatus("pagado", "Pedido pagado en efectivo", {
                isPaid: true,
                paymentMethod: "efectivo",
              }),
            "Confirmar Pago en Efectivo",
            "¿Estás seguro de que el pago en efectivo fue recibido?",
          ),
        variant: "default" as const,
      })
    }

    if (canUserPerformAction("pay_transfer")) {
      actions.push({
        label: "Pago por Transferencia",
        action: () =>
          handleActionWithCountdown(
            () =>
              updateOrderStatus("entregado", "Transferencia reportada - Esperando verificación", {
                paymentMethod: "transferencia",
                awaitingPaymentVerification: true,
              }),
            "Reportar Transferencia",
            "¿Estás seguro de que quieres reportar el pago por transferencia?",
          ),
        variant: "outline" as const,
      })
    }

    if (canUserPerformAction("verify_transfer")) {
      actions.push({
        label: "Verificar Transferencia",
        action: () =>
          handleActionWithCountdown(
            () =>
              updateOrderStatus("pagado", "Transferencia verificada y confirmada", {
                isPaid: true,
                awaitingPaymentVerification: false,
              }),
            "Verificar Transferencia",
            "¿Estás seguro de que la transferencia fue verificada y recibida?",
          ),
        variant: "default" as const,
      })
    }

    return actions
  }

  const getStatusIcon = (status: OrderStatus) => {
    const IconComponent = STATUS_CONFIG[status].icon
    return <IconComponent className="w-4 h-4" />
  }

  return (
    <>
      <Dialog
        open={true}
        onOpenChange={() => {
          stopWorking()
          onClose()
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl">{order.clientName}</DialogTitle>
                <p className="text-sm text-gray-600 mt-1">ID: {order.id}</p>
                {hasUnsavedChanges && <p className="text-sm text-orange-600 mt-1">⚠️ Hay cambios sin guardar</p>}
                {copyMessage && <p className="text-sm text-green-600 mt-1">✓ {copyMessage}</p>}
                {isBeingWorkedOnByOther && currentUser.role === "armador" && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800 flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <strong>{order.currentlyWorkingBy}</strong> está trabajando en este pedido
                      {order.workingStartTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getWorkingTime()}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={`${STATUS_CONFIG[order.status].color} text-white flex items-center gap-1`}>
                  {getStatusIcon(order.status)}
                  {STATUS_CONFIG[order.status].label}
                </Badge>
                {order.awaitingPaymentVerification && (
                  <Badge variant="outline" className="text-xs">
                    Esperando verificación de Vale
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
            {/* Información del pedido */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información del Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">Nombre:</span> {order.clientName}
                  </div>
                  {order.clientAddress && (
                    <div>
                      <span className="font-medium">Dirección:</span> {order.clientAddress}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Creado:</span> {order.createdAt.toLocaleString()}
                  </div>
                  {order.armedBy && (
                    <div>
                      <span className="font-medium">Armado por:</span> {order.armedBy}
                    </div>
                  )}
                  {order.controlledBy && (
                    <div>
                      <span className="font-medium">Controlado por:</span> {order.controlledBy}
                    </div>
                  )}
                  {order.initialNotes && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-blue-800">Observaciones iniciales:</span>
                      <p className="text-blue-700 mt-1">{order.initialNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Productos</CardTitle>
                    {canUserPerformAction("edit_presupuesto") && !isBeingWorkedOnByOther && (
                      <Button
                        onClick={addProduct}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2 bg-transparent"
                      >
                        <Plus className="w-4 h-4" />
                        {order.status === "armado_controlado" ? "Agregar Producto" : "Agregar"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {localProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className={`flex flex-col gap-3 p-3 border rounded-lg transition-colors ${
                          canUserPerformAction("edit_products") &&
                          !canUserPerformAction("edit_presupuesto") &&
                          !isBeingWorkedOnByOther
                            ? product.isChecked
                              ? "bg-green-50 border-green-200 cursor-pointer"
                              : "hover:bg-gray-50 cursor-pointer"
                            : ""
                        } ${isBeingWorkedOnByOther ? "opacity-60" : ""}`}
                        onClick={() => {
                          if (
                            canUserPerformAction("edit_products") &&
                            !canUserPerformAction("edit_presupuesto") &&
                            !isBeingWorkedOnByOther
                          ) {
                            toggleLocalProductCheck(product.id)
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {canUserPerformAction("edit_products") &&
                            !canUserPerformAction("edit_presupuesto") &&
                            !isBeingWorkedOnByOther && (
                              <Checkbox
                                checked={product.isChecked || false}
                                onCheckedChange={() => toggleLocalProductCheck(product.id)}
                                className="pointer-events-none"
                              />
                            )}

                          <div className="flex-1">
                            {canUserPerformAction("edit_presupuesto") && !isBeingWorkedOnByOther ? (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  {product.code !== undefined && (
                                    <Input
                                      placeholder="Código"
                                      value={product.code || ""}
                                      onChange={(e) => updateProductCode(product.id, e.target.value)}
                                      className="w-24"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                  <Input
                                    placeholder="Nombre del producto"
                                    value={product.name}
                                    onChange={(e) => updateProductName(product.id, e.target.value)}
                                    className="flex-1"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {product.code && (
                                  <Badge variant="outline" className="text-xs">
                                    {product.code}
                                  </Badge>
                                )}
                                <span className="font-medium font-medium-responsive">{product.name}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {editingProduct === product.id ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  type="number"
                                  value={editQuantity}
                                  onChange={(e) => setEditQuantity(Number.parseFloat(e.target.value) || 0)}
                                  className="w-24"
                                  step="0.01"
                                  min="0"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateLocalProductQuantity(product.id, editQuantity)
                                    } else if (e.key === "Escape") {
                                      setEditingProduct(null)
                                      setEditQuantity(0)
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => updateLocalProductQuantity(product.id, editQuantity)}
                                  disabled={editQuantity < 0}
                                >
                                  <Save className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingProduct(null)
                                    setEditQuantity(0)
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {canUserPerformAction("edit_presupuesto") && !isBeingWorkedOnByOther ? (
                                  <Input
                                    type="number"
                                    value={product.quantity}
                                    onChange={(e) =>
                                      updateLocalProductQuantity(product.id, Number.parseFloat(e.target.value) || 1)
                                    }
                                    className="w-24"
                                    step="0.01"
                                    min="1"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <Badge variant="outline">{product.quantity}</Badge>
                                )}
                                {product.originalQuantity && product.originalQuantity !== product.quantity && (
                                  <span className="text-xs text-gray-500">(orig: {product.originalQuantity})</span>
                                )}
                                {canUserPerformAction("edit_products") &&
                                  !canUserPerformAction("edit_presupuesto") &&
                                  !isBeingWorkedOnByOther && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingProduct(product.id)
                                        setEditQuantity(product.quantity)
                                      }}
                                      title="Editar cantidad"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                  )}
                                {canUserPerformAction("edit_presupuesto") &&
                                  localProducts.length > 1 &&
                                  !isBeingWorkedOnByOther && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        removeProduct(product.id)
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                      title="Eliminar producto"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Faltantes */}
              {order.missingProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Faltantes ({order.missingProducts.length})
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyMissingProducts}
                          className="flex items-center gap-1 bg-transparent"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowMissing(!showMissing)}>
                          {showMissing ? "Ocultar" : "Ver"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {showMissing && (
                    <CardContent>
                      <div className="space-y-2">
                        {order.missingProducts.map((missing) => (
                          <div
                            key={missing.productId}
                            className="flex justify-between items-center py-2 px-3 bg-red-50 rounded-lg"
                          >
                            <div>
                              {missing.code && (
                                <Badge variant="outline" className="text-xs mr-2">
                                  {missing.code}
                                </Badge>
                              )}
                              <span className="text-red-700">{missing.productName}</span>
                            </div>
                            <Badge variant="destructive">{missing.quantity}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Productos Devueltos */}
              {order.returnedProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        Productos Devueltos ({order.returnedProducts.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {order.returnedProducts.map((returned, index) => (
                        <div
                          key={`${returned.productId}-${index}`}
                          className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-lg"
                        >
                          <div>
                            {returned.code && (
                              <Badge variant="outline" className="text-xs mr-2">
                                {returned.code}
                              </Badge>
                            )}
                            <span className="text-blue-700">{returned.productName}</span>
                            {returned.reason && <p className="text-xs text-blue-600 mt-1">{returned.reason}</p>}
                          </div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {returned.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Acciones y historial */}
            <div className="space-y-4">
              {/* Acciones */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Acciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observaciones</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Agregar observaciones..."
                      rows={3}
                      disabled={isBeingWorkedOnByOther}
                    />
                  </div>

                  <div className="space-y-2">
                    {getAvailableActions().map((action, index) => (
                      <Button
                        key={index}
                        onClick={action.action}
                        variant={action.variant}
                        className="w-full"
                        disabled={action.disabled}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>

                  {/* Botón para copiar resumen de factura (solo para Vale después del control) */}
                  {currentUser.role === "vale" && order.status === "armado_controlado" && !isBeingWorkedOnByOther && (
                    <Button
                      onClick={copyInvoiceSummary}
                      variant="outline"
                      className="w-full flex items-center gap-2 bg-transparent"
                    >
                      <FileText className="w-4 h-4" />
                      Copiar Resumen de Factura
                    </Button>
                  )}

                  {order.isPaid && (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Pedido Completado</span>
                      </div>
                      {order.paymentMethod && (
                        <p className="text-sm text-gray-600 mt-1">Pagado con {order.paymentMethod}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Historial */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historial</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {order.history
                      .slice()
                      .reverse()
                      .map((entry) => (
                        <div key={entry.id} className="border-l-2 border-blue-200 pl-4 pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{entry.action}</p>
                              <p className="text-xs text-gray-600">por {entry.user}</p>
                              {entry.notes && <p className="text-xs text-gray-700 mt-1 italic">{entry.notes}</p>}
                            </div>
                            <span className="text-xs text-gray-500">{entry.timestamp.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SuccessAlert show={showSuccessAlert} message={successMessage} onClose={() => setShowSuccessAlert(false)} />

      <ConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title={pendingAction?.title || ""}
        message={pendingAction?.message || ""}
        confirmText={pendingAction?.confirmText || ""}
        onConfirm={() => {
          pendingAction?.action()
          setPendingAction(null)
        }}
      />

      <CountdownConfirmation
        open={showCountdown}
        onOpenChange={setShowCountdown}
        title={countdownAction?.title || ""}
        message={countdownAction?.message || ""}
        onConfirm={() => {
          countdownAction?.action()
          setCountdownAction(null)
        }}
        onCancel={() => {
          setCountdownAction(null)
        }}
      />
    </>
  )
}
