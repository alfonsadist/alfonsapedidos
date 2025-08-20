"use client"

import { createClient } from "@supabase/supabase-js"
import { useState, useEffect } from "react"
import type { Order, User } from "../app/page"

// Verificar que las variables de entorno existan
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Crear el cliente de Supabase
export const supabase =
  supabaseUrl && supabaseKey && supabaseUrl.startsWith("http") ? createClient(supabaseUrl, supabaseKey) : null

// Usuarios por defecto (fallback si no hay Supabase)
const DEFAULT_USERS: User[] = [
  { id: "1", name: "Vale", role: "vale" },
  { id: "2", name: "Lucho", role: "armador" },
  { id: "3", name: "Franco", role: "armador" },
  { id: "4", name: "Negro", role: "armador" },
]

// Persistencia de usuario
export const saveCurrentUser = (user: User) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("currentUser", JSON.stringify(user))
  }
}

export const getCurrentUser = (): User | null => {
  if (typeof window !== "undefined") {
    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      try {
        return JSON.parse(savedUser)
      } catch (error) {
        console.error("Error parsing saved user:", error)
        localStorage.removeItem("currentUser")
      }
    }
  }
  return null
}

export const clearCurrentUser = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("currentUser")
  }
}

// IDs únicos
const generateUniqueId = (prefix = "") => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `${prefix}${timestamp}-${random}`
}

export function useSupabase() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const useSupabaseDB = !!supabase
  const useLocalStorage = !supabase

  useEffect(() => {
    if (useSupabaseDB) {
      console.log("✅ Conectado a Supabase - Datos en tiempo real activados")
    } else {
      console.log("⚠️ Usando localStorage - Configura Supabase para datos en tiempo real")
    }
  }, [useSupabaseDB])

  // ===== Obtener pedidos (ahora con filtro rápido de activos) =====
  const fetchOrders = async (opts?: { onlyActive?: boolean }): Promise<Order[]> => {
    const onlyActive = !!opts?.onlyActive
    setLoading(true)
    setError(null)

    try {
      if (useLocalStorage) {
        const savedOrders = localStorage.getItem("orders")
        let parsed: Order[] = []
        if (savedOrders) {
          parsed = JSON.parse(savedOrders).map((order: any) => ({
            ...order,
            createdAt: new Date(order.createdAt),
            workingStartTime: order.workingStartTime ? new Date(order.workingStartTime) : undefined,
            history: order.history.map((h: any) => ({
              ...h,
              timestamp: new Date(h.timestamp),
            })),
          }))
        }
        if (onlyActive) {
          parsed = parsed.filter((o) => o.status !== "pagado" && o.status !== "entregado")
        }
        // ordenar por fecha desc (como en supabase)
        parsed.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        return parsed
      }

      // 1) Traer SOLO las órdenes (más rápido y baratas)
      let baseQuery = supabase!.from("orders").select("*").order("created_at", { ascending: false })
      if (onlyActive) {
        // activos = todo excepto entregado/pagado
        baseQuery = baseQuery.neq("status", "pagado").neq("status", "entregado")
      }

      console.log("🔄 Obteniendo pedidos desde Supabase...", onlyActive ? "(solo activos)" : "(todos)")
      const { data: ordersRows, error: ordersError } = await baseQuery
      if (ordersError) throw ordersError
      if (!ordersRows || ordersRows.length === 0) return []

      const orders: Order[] = []

      // 2) Para cada orden, traer sus tablas asociadas (sigue igual, pero con menos órdenes cuando onlyActive=true)
      for (const orderData of ordersRows) {
        const [{ data: productsData, error: productsError }, { data: missingData, error: missingError }, { data: returnedData, error: returnedError }, { data: historyData, error: historyError }] =
          await Promise.all([
            supabase!.from("products").select("*").eq("order_id", orderData.id),
            supabase!.from("missing_products").select("*").eq("order_id", orderData.id),
            supabase!.from("returned_products").select("*").eq("order_id", orderData.id),
            supabase!.from("order_history").select("*").eq("order_id", orderData.id).order("created_at", { ascending: true }),
          ])

        if (productsError) throw productsError
        if (missingError) throw missingError
        if (returnedError) throw returnedError
        if (historyError) throw historyError

        const order: Order = {
          id: orderData.id,
          clientName: orderData.client_name,
          clientAddress: orderData.client_address || "",
          status: orderData.status,
          paymentMethod: orderData.payment_method,
          isPaid: orderData.is_paid,
          armedBy: orderData.armed_by,
          controlledBy: orderData.controlled_by,
          awaitingPaymentVerification: orderData.awaiting_payment_verification,
          initialNotes: orderData.initial_notes,
          createdAt: new Date(orderData.created_at),
          currentlyWorkingBy: orderData.currently_working_by,
          workingStartTime: orderData.working_start_time ? new Date(orderData.working_start_time) : undefined,
          totalAmount: orderData.total_amount ? Number.parseFloat(orderData.total_amount) : undefined,
          products: (productsData ?? []).map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            quantity: Number.parseFloat(p.quantity),
            originalQuantity: p.original_quantity ? Number.parseFloat(p.original_quantity) : undefined,
            isChecked: p.is_checked,
            unitPrice: p.unit_price ? Number.parseFloat(p.unit_price) : undefined,
            subtotal: p.subtotal ? Number.parseFloat(p.subtotal) : undefined,
          })),
          missingProducts: (missingData ?? []).map((m) => ({
            productId: m.product_id,
            productName: m.product_name,
            code: m.code,
            quantity: Number.parseFloat(m.quantity),
          })),
          returnedProducts: (returnedData ?? []).map((r) => ({
            productId: r.product_id,
            productName: r.product_name,
            code: r.code,
            quantity: Number.parseFloat(r.quantity),
            reason: r.reason,
          })),
          history: (historyData ?? []).map((h) => ({
            id: h.id,
            action: h.action,
            user: h.user_name,
            timestamp: new Date(h.created_at),
            notes: h.notes,
          })),
        }

        orders.push(order)
      }

      console.log(`✅ ${orders.length} pedidos obtenidos desde Supabase`)
      return orders
    } catch (err) {
      console.error("❌ Error fetching orders:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      return []
    } finally {
      setLoading(false)
    }
  }

  // ===== Crear pedido =====
  const createOrder = async (
    orderData: Omit<
      Order,
      | "id"
      | "createdAt"
      | "history"
      | "status"
      | "missingProducts"
      | "isPaid"
      | "returnedProducts"
      | "currentlyWorkingBy"
      | "workingStartTime"
    >,
    currentUser: User,
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const orderId = generateUniqueId("PED-")
      console.log("🚀 Creando pedido con ID:", orderId)

      if (useLocalStorage) {
        const newOrder: Order = {
          ...orderData,
          id: orderId,
          status: "en_armado",
          missingProducts: [],
          returnedProducts: [],
          isPaid: false,
          createdAt: new Date(),
          history: [
            {
              id: generateUniqueId("HIST-"),
              action: "Presupuesto creado y pedido listo para armar",
              user: currentUser.name,
              timestamp: new Date(),
              notes: orderData.initialNotes || undefined,
            },
          ],
          products: orderData.products.map((p) => ({
            ...p,
            id: p.id || generateUniqueId("PROD-"),
            originalQuantity: p.quantity,
            isChecked: false,
          })),
        }

        const savedOrders = localStorage.getItem("orders")
        const orders = savedOrders ? JSON.parse(savedOrders) : []
        orders.push(newOrder)
        localStorage.setItem("orders", JSON.stringify(orders))

        broadcastNotification({
          type: "info",
          title: "Nuevo Presupuesto",
          message: `Vale creó un presupuesto para ${orderData.clientName}`,
          excludeUser: currentUser.name,
        })

        return true
      }

      // Supabase
      const { error: orderError } = await supabase!.from("orders").insert({
        id: orderId,
        client_name: orderData.clientName,
        client_address: orderData.clientAddress,
        status: "en_armado",
        is_paid: false,
        initial_notes: orderData.initialNotes,
        total_amount: orderData.totalAmount,
      })
      if (orderError) throw orderError

      const productsToInsert = orderData.products.map((product) => ({
        id: product.id || generateUniqueId("PROD-"),
        order_id: orderId,
        code: product.code,
        name: product.name,
        quantity: product.quantity,
        original_quantity: product.quantity,
        is_checked: false,
        unit_price: product.unitPrice,
        subtotal: product.subtotal,
      }))

      const { error: productsError } = await supabase!.from("products").insert(productsToInsert)
      if (productsError) throw productsError

      const historyId = generateUniqueId("HIST-")
      const { error: historyError } = await supabase!.from("order_history").insert({
        id: historyId,
        order_id: orderId,
        action: "Presupuesto creado y pedido listo para armar",
        user_name: currentUser.name,
        notes: orderData.initialNotes,
      })
      if (historyError) throw historyError

      broadcastNotification({
        type: "info",
        title: "Nuevo Presupuesto",
        message: `Vale creó un presupuesto para ${orderData.clientName}`,
        excludeUser: currentUser.name,
      })

      console.log("🎉 Pedido creado exitosamente:", orderId)
      return true
    } catch (err) {
      console.error("❌ Error completo al crear pedido:", err)
      setError(err instanceof Error ? err.message : "Error al crear pedido")
      return false
    } finally {
      setLoading(false)
    }
  }

  // ===== Working flags =====
  const setWorkingOnOrder = async (orderId: string, userName: string, userRole: string): Promise<boolean> => {
    if (userRole !== "armador") return true
    try {
      if (useLocalStorage) {
        const savedOrders = localStorage.getItem("orders")
        const orders = savedOrders ? JSON.parse(savedOrders) : []
        const idx = orders.findIndex((o: Order) => o.id === orderId)
        if (idx >= 0) {
          orders[idx].currentlyWorkingBy = userName
          orders[idx].workingStartTime = new Date()
          localStorage.setItem("orders", JSON.stringify(orders))
        }
        return true
      }

      const { error } = await supabase!
        .from("orders")
        .update({ currently_working_by: userName, working_start_time: new Date().toISOString() })
        .eq("id", orderId)
      if (error) throw error
      return true
    } catch (err) {
      console.error("❌ Error setting working status:", err)
      return false
    }
  }

  const clearWorkingOnOrder = async (orderId: string, userName?: string, userRole?: string): Promise<boolean> => {
    if (userRole && userRole !== "armador") return true
    try {
      if (useLocalStorage) {
        const savedOrders = localStorage.getItem("orders")
        const orders = savedOrders ? JSON.parse(savedOrders) : []
        const idx = orders.findIndex((o: Order) => o.id === orderId)
        if (idx >= 0) {
          if (!userName || orders[idx].currentlyWorkingBy === userName) {
            orders[idx].currentlyWorkingBy = undefined
            orders[idx].workingStartTime = undefined
            localStorage.setItem("orders", JSON.stringify(orders))
          }
        }
        return true
      }

      const { error } = await supabase!
        .from("orders")
        .update({ currently_working_by: null, working_start_time: null })
        .eq("id", orderId)
      if (error) throw error
      return true
    } catch (err) {
      console.error("❌ Error clearing working status:", err)
      return false
    }
  }

  // ===== Update / Delete / Users (sin cambios de lógica) =====
  const updateOrder = async (order: Order, currentUser?: User): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      if (useLocalStorage) {
        const savedOrders = localStorage.getItem("orders")
        const orders = savedOrders ? JSON.parse(savedOrders) : []
        const idx = orders.findIndex((o: Order) => o.id === order.id)
        if (idx >= 0) {
          orders[idx] = order
          localStorage.setItem("orders", JSON.stringify(orders))
        }
        if (currentUser) {
          const last = order.history[order.history.length - 1]
          if (last && last.user === currentUser.name) {
            broadcastNotification({
              type: "success",
              title: "Estado Actualizado",
              message: `${currentUser.name} actualizó el pedido de ${order.clientName}`,
              excludeUser: currentUser.name,
            })
          }
        }
        return true
      }

      const { error: orderError } = await supabase!
        .from("orders")
        .update({
          client_name: order.clientName,
          client_address: order.clientAddress,
          status: order.status,
          payment_method: order.paymentMethod,
          is_paid: order.isPaid,
          armed_by: order.armedBy,
          controlled_by: order.controlledBy,
          awaiting_payment_verification: order.awaitingPaymentVerification,
          initial_notes: order.initialNotes,
          currently_working_by: order.currentlyWorkingBy,
          working_start_time: order.workingStartTime?.toISOString(),
          total_amount: order.totalAmount,
        })
        .eq("id", order.id)
      if (orderError) throw orderError

      await supabase!.from("products").delete().eq("order_id", order.id)
      if (order.products.length > 0) {
        const productsToInsert = order.products.map((p) => ({
          id: p.id || generateUniqueId("PROD-"),
          order_id: order.id,
          code: p.code,
          name: p.name,
          quantity: p.quantity,
          original_quantity: p.originalQuantity,
          is_checked: p.isChecked,
          unit_price: p.unitPrice,
          subtotal: p.subtotal,
        }))
        const { error: productsError } = await supabase!.from("products").insert(productsToInsert)
        if (productsError) throw productsError
      }

      await supabase!.from("missing_products").delete().eq("order_id", order.id)
      if (order.missingProducts.length > 0) {
        const missingToInsert = order.missingProducts.map((m) => ({
          order_id: order.id,
          product_id: m.productId,
          product_name: m.productName,
          code: m.code,
          quantity: m.quantity,
        }))
        const { error: missingError } = await supabase!.from("missing_products").insert(missingToInsert)
        if (missingError) throw missingError
      }

      await supabase!.from("returned_products").delete().eq("order_id", order.id)
      if (order.returnedProducts.length > 0) {
        const returnedToInsert = order.returnedProducts.map((r) => ({
          order_id: order.id,
          product_id: r.productId,
          product_name: r.productName,
          code: r.code,
          quantity: r.quantity,
          reason: r.reason,
        }))
        const { error: returnedError } = await supabase!.from("returned_products").insert(returnedToInsert)
        if (returnedError) throw returnedError
      }

      const { data: existingHistory } = await supabase!.from("order_history").select("id").eq("order_id", order.id)
      const existingIds = new Set(existingHistory?.map((h) => h.id) || [])
      const newHistoryEntries = order.history.filter((h) => !existingIds.has(h.id))
      if (newHistoryEntries.length > 0) {
        const historyToInsert = newHistoryEntries.map((h) => ({
          id: h.id || generateUniqueId("HIST-"),
          order_id: order.id,
          action: h.action,
          user_name: h.user,
          notes: h.notes,
          created_at: h.timestamp.toISOString(),
        }))
        const { error: historyError } = await supabase!.from("order_history").insert(historyToInsert)
        if (historyError) throw historyError
      }

      if (currentUser) {
        const last = order.history[order.history.length - 1]
        if (last && last.user === currentUser.name) {
          broadcastNotification({
            type: "success",
            title: "Estado Actualizado",
            message: `${currentUser.name} actualizó el pedido de ${order.clientName}`,
            excludeUser: currentUser.name,
          })
        }
      }

      console.log("✅ Pedido actualizado exitosamente en Supabase")
      return true
    } catch (err) {
      console.error("❌ Error al actualizar pedido:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar pedido")
      return false
    } finally {
      setLoading(false)
    }
  }

  const deleteOrder = async (orderId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      if (useLocalStorage) {
        const savedOrders = localStorage.getItem("orders")
        const orders = savedOrders ? JSON.parse(savedOrders) : []
        const filtered = orders.filter((o: Order) => o.id !== orderId)
        localStorage.setItem("orders", JSON.stringify(filtered))
        return true
      }
      const { error } = await supabase!.from("orders").delete().eq("id", orderId)
      if (error) throw error
      return true
    } catch (err) {
      console.error("❌ Error al eliminar pedido:", err)
      setError(err instanceof Error ? err.message : "Error al eliminar pedido")
      return false
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (): Promise<User[]> => {
    if (useLocalStorage) return DEFAULT_USERS
    try {
      const { data, error } = await supabase!.from("users").select("*").order("name")
      if (error) {
        console.error("❌ Error al obtener usuarios:", error)
        setError(error.message)
        return DEFAULT_USERS
      }
      return (data || []).map((u) => ({ id: u.id, name: u.name, role: u.role }))
    } catch (err) {
      console.error("❌ Error fetching users:", err)
      return DEFAULT_USERS
    }
  }

  return {
    loading,
    error,
    fetchOrders, // <- ahora con opción onlyActive
    createOrder,
    updateOrder,
    deleteOrder,
    fetchUsers,
    setWorkingOnOrder,
    clearWorkingOnOrder,
    isConnectedToSupabase: useSupabaseDB,
  }
}

// ===== Broadcasting entre pestañas =====
interface BroadcastNotification {
  type: "success" | "error" | "info" | "warning"
  title: string
  message: string
  excludeUser?: string
}

const broadcastNotification = (notification: BroadcastNotification) => {
  const broadcastData = { ...notification, timestamp: Date.now(), id: generateUniqueId("NOTIF-") }
  localStorage.setItem("broadcast_notification", JSON.stringify(broadcastData))
  setTimeout(() => {
    localStorage.removeItem("broadcast_notification")
  }, 1000)
}

// ===== Hooks auxiliares =====
export const useBroadcastNotifications = (currentUserName: string, onNotification: (notification: any) => void) => {
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === "broadcast_notification" && e.newValue) {
        try {
          const notification = JSON.parse(e.newValue)
          if (notification.excludeUser !== currentUserName) {
            onNotification(notification)
          }
        } catch (error) {
          console.error("Error parsing broadcast notification:", error)
        }
      }
    })
  }
}

export const useRealtimeOrders = (onOrderChange: (payload: any) => void) => {
  useEffect(() => {
    if (!supabase) return
    console.log("🔴 Configurando suscripciones en tiempo real...")
    const ch = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, onOrderChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, onOrderChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_history" }, onOrderChange)
      .subscribe()
    return () => {
      console.log("🔴 Desconectando suscripciones en tiempo real...")
      supabase.removeChannel(ch)
    }
  }, [onOrderChange])
}
