"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Search,
  Package,
  CheckCircle,
  Truck,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Edit3,
  History,
  Loader2,
} from "lucide-react"
import { OrderDialog } from "./components/order-dialog"
import { OrderDetail } from "./components/order-detail"
import { useSupabase } from "../hooks/use-supabase"
import Image from "next/image"

// Tipos de datos
export type OrderStatus =
  | "en_armado"
  | "armado"
  | "armado_controlado"
  | "facturado"
  | "factura_controlada"
  | "en_transito"
  | "entregado"
  | "pagado"

export type User = {
  id: string
  name: string
  role: "vale" | "armador"
}

export type Product = {
  id: string
  code?: string
  name: string
  quantity: number
  originalQuantity?: number // Para tracking de faltantes
  isChecked?: boolean // Para marcar como "bien"
}

export type MissingProduct = {
  productId: string
  productName: string
  code?: string
  quantity: number
}

export type ReturnedProduct = {
  productId: string
  productName: string
  code?: string
  quantity: number
  reason?: string
}

export type HistoryEntry = {
  id: string
  action: string
  user: string
  timestamp: Date
  notes?: string
}

export type Order = {
  id: string
  clientName: string
  clientAddress: string
  products: Product[]
  status: OrderStatus
  missingProducts: MissingProduct[]
  returnedProducts: ReturnedProduct[]
  paymentMethod?: "efectivo" | "transferencia"
  isPaid: boolean
  createdAt: Date
  history: HistoryEntry[]
  armedBy?: string // Quien armó el pedido
  controlledBy?: string // Quien controló el pedido
  awaitingPaymentVerification?: boolean // Para transferencias que esperan verificación de Vale
  initialNotes?: string // Observaciones iniciales de Vale
}

// Estados y sus colores
const STATUS_CONFIG = {
  en_armado: { label: "En Armado", color: "bg-yellow-500", icon: Package },
  armado: { label: "Armado", color: "bg-blue-500", icon: CheckCircle },
  armado_controlado: { label: "Armado Controlado", color: "bg-green-500", icon: CheckCircle },
  facturado: { label: "Facturado", color: "bg-purple-500", icon: DollarSign },
  factura_controlada: { label: "Factura Controlada", color: "bg-indigo-500", icon: CheckCircle },
  en_transito: { label: "En Tránsito", color: "bg-orange-500", icon: Truck },
  entregado: { label: "Entregado", color: "bg-green-600", icon: CheckCircle },
  pagado: { label: "Pagado", color: "bg-green-700", icon: DollarSign },
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [activeTab, setActiveTab] = useState("active")

  const { loading, error, fetchOrders, createOrder, updateOrder, deleteOrder, fetchUsers } = useSupabase()

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      const [ordersData, usersData] = await Promise.all([fetchOrders(), fetchUsers()])

      setOrders(ordersData)
      setUsers(usersData)

      // Establecer usuario por defecto (Vale)
      if (usersData.length > 0 && !currentUser) {
        setCurrentUser(usersData.find((u) => u.name === "Vale") || usersData[0])
      }
    }

    loadData()
  }, [])

  // Refrescar datos cada 30 segundos para sincronización
  useEffect(() => {
    const interval = setInterval(async () => {
      const ordersData = await fetchOrders()
      setOrders(ordersData)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Filtrar pedidos activos y completados
  const activeOrders = orders.filter((order) => order.status !== "pagado")
  const completedOrders = orders.filter((order) => order.status === "pagado")

  // Aplicar filtro de búsqueda
  const getFilteredOrders = (ordersList: Order[]) => {
    return ordersList.filter(
      (order) =>
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }

  const filteredActiveOrders = getFilteredOrders(activeOrders)
  const filteredCompletedOrders = getFilteredOrders(completedOrders)

  // Crear nuevo pedido
  const handleCreateOrder = async (
    orderData: Omit<
      Order,
      "id" | "createdAt" | "history" | "status" | "missingProducts" | "isPaid" | "returnedProducts"
    >,
  ) => {
    if (!currentUser) return

    const success = await createOrder(orderData, currentUser)
    if (success) {
      setShowOrderDialog(false)
      // Refrescar datos
      const ordersData = await fetchOrders()
      setOrders(ordersData)
    }
  }

  // Actualizar pedido
  const handleUpdateOrder = async (updatedOrder: Order) => {
    const success = await updateOrder(updatedOrder)
    if (success) {
      // Refrescar datos
      const ordersData = await fetchOrders()
      setOrders(ordersData)
    }
  }

  // Eliminar pedido
  const handleDeleteOrder = async (orderId: string) => {
    const success = await deleteOrder(orderId)
    if (success) {
      // Refrescar datos
      const ordersData = await fetchOrders()
      setOrders(ordersData)
    }
  }

  const getStatusIcon = (status: OrderStatus) => {
    const IconComponent = STATUS_CONFIG[status].icon
    return <IconComponent className="w-4 h-4" />
  }

  const getOrderPriorityColor = (order: Order) => {
    if (order.missingProducts.length > 0) return "border-l-4 border-l-orange-500"
    if (order.awaitingPaymentVerification) return "border-l-4 border-l-blue-500"
    return ""
  }

  const getNextActionForUser = (order: Order, user: User) => {
    if (user.role === "armador") {
      if (order.status === "en_armado") {
        return { label: "Armar Pedido", icon: Package }
      }
      if (order.status === "armado" && order.armedBy !== user.name) {
        return { label: "Controlar Armado", icon: CheckCircle }
      }
      if (order.status === "facturado") {
        return { label: "Controlar Factura", icon: CheckCircle }
      }
      if (order.status === "factura_controlada") {
        return { label: "Marcar En Tránsito", icon: Truck }
      }
      if (order.status === "en_transito") {
        return { label: "Marcar Entregado", icon: CheckCircle }
      }
      if (order.status === "entregado" && !order.isPaid) {
        return { label: "Procesar Pago", icon: DollarSign }
      }
    }

    if (user.role === "vale") {
      if (order.status === "en_armado") {
        return { label: "Editar Presupuesto", icon: Edit3 }
      }
      if (order.status === "armado_controlado") {
        return { label: "Facturar", icon: DollarSign }
      }
      if (order.awaitingPaymentVerification) {
        return { label: "Verificar Transferencia", icon: CheckCircle }
      }
    }

    return null
  }

  const renderOrderCard = (order: Order, showDeleteButton = true) => {
    if (!currentUser) return null

    const nextAction = getNextActionForUser(order, currentUser)

    return (
      <Card
        key={order.id}
        className={`cursor-pointer hover:shadow-lg transition-shadow ${getOrderPriorityColor(order)}`}
        onClick={() => setSelectedOrder(order)}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{order.clientName}</CardTitle>
              <CardDescription className="text-sm">ID: {order.id}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={`${STATUS_CONFIG[order.status].color} text-white flex items-center gap-1`}>
                {getStatusIcon(order.status)}
                {STATUS_CONFIG[order.status].label}
              </Badge>
              {order.awaitingPaymentVerification && (
                <Badge variant="outline" className="text-xs">
                  Esperando verificación
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Productos:</span>
              <span className="font-medium">{order.products.length}</span>
            </div>

            {order.missingProducts.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Faltantes:
                </span>
                <span className="font-medium text-red-600">{order.missingProducts.length}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Creado:</span>
              <span className="font-medium">{order.createdAt.toLocaleDateString()}</span>
            </div>

            {order.armedBy && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Armado por:</span>
                <span className="font-medium">{order.armedBy}</span>
              </div>
            )}

            {order.status === "entregado" && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pago:</span>
                <Badge variant={order.isPaid ? "default" : "destructive"}>
                  {order.isPaid ? "Pagado" : "Pendiente"}
                </Badge>
              </div>
            )}

            {order.status === "pagado" && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Método de pago:</span>
                <Badge variant="outline">{order.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}</Badge>
              </div>
            )}

            {/* Botón de acción siguiente */}
            {nextAction && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedOrder(order)
                  }}
                >
                  <nextAction.icon className="w-4 h-4" />
                  {nextAction.label}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        {currentUser.role === "vale" && showDeleteButton && (
          <div className="px-6 pb-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                if (
                  confirm(
                    `¿Estás seguro de que quieres eliminar el pedido de ${order.clientName}? Esta acción no se puede deshacer.`,
                  )
                ) {
                  handleDeleteOrder(order.id)
                }
              }}
            >
              Eliminar Pedido
            </Button>
          </div>
        )}
      </Card>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando sistema...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <Image
                  src="/alfonsa-logo.png"
                  alt="Alfonsa Distribuidora"
                  width={80}
                  height={80}
                  className="object-contain"
                />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Gestión de Pedidos</h1>
                  <p className="text-gray-600 mt-1">Control completo del proceso de pedidos</p>
                  {error && <p className="text-red-600 text-sm mt-1">Error: {error}</p>}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <select
                value={currentUser.id}
                onChange={(e) => setCurrentUser(users.find((u) => u.id === e.target.value) || users[0])}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>

              {currentUser.role === "vale" && (
                <Button onClick={() => setShowOrderDialog(true)} className="flex items-center gap-2" disabled={loading}>
                  <Plus className="w-4 h-4" />
                  Nuevo Presupuesto
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs para Pedidos Activos y Completados */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Pedidos Activos ({filteredActiveOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Completados ({filteredCompletedOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Búsqueda */}
          <div className="mt-6 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por cliente o ID de pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value="active">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Cargando pedidos activos...</p>
              </div>
            ) : (
              <>
                {/* Lista de pedidos activos */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredActiveOrders.map((order) => renderOrderCard(order, true))}
                </div>

                {filteredActiveOrders.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos activos</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm
                        ? "No se encontraron pedidos con ese criterio"
                        : "Comienza creando tu primer presupuesto"}
                    </p>
                    {!searchTerm && currentUser.role === "vale" && (
                      <Button onClick={() => setShowOrderDialog(true)}>Crear Primer Presupuesto</Button>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Cargando historial...</p>
              </div>
            ) : (
              <>
                {/* Lista de pedidos completados */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCompletedOrders.map((order) => renderOrderCard(order, false))}
                </div>

                {filteredCompletedOrders.length === 0 && (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos completados</h3>
                    <p className="text-gray-600">
                      {searchTerm
                        ? "No se encontraron pedidos completados con ese criterio"
                        : "Los pedidos completados aparecerán aquí"}
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogos */}
      {currentUser.role === "vale" && (
        <OrderDialog open={showOrderDialog} onOpenChange={setShowOrderDialog} onCreateOrder={handleCreateOrder} />
      )}

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          currentUser={currentUser}
          onClose={() => setSelectedOrder(null)}
          onUpdateOrder={handleUpdateOrder}
        />
      )}
    </div>
  )
}
