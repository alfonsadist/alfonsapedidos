"use client"

import { createClient } from "@supabase/supabase-js"
import { useState } from "react"
import type { Order, User } from "../app/page"

// Verificar que las variables de entorno existan
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Solo crear el cliente si las variables están configuradas correctamente
export const supabase =
  supabaseUrl && supabaseKey && supabaseUrl.startsWith("http") ? createClient(supabaseUrl, supabaseKey) : null

// Si no hay Supabase configurado, mostrar advertencia
if (!supabase) {
  console.warn(
    "⚠️ Supabase no configurado. Usando datos locales.\n" +
      "Para usar la base de datos real, configura:\n" +
      "- NEXT_PUBLIC_SUPABASE_URL\n" +
      "- NEXT_PUBLIC_SUPABASE_ANON_KEY",
  )
}

// Usuarios por defecto (fallback si no hay Supabase)
const DEFAULT_USERS: User[] = [
  { id: "1", name: "Vale", role: "vale" },
  { id: "2", name: "Lucho", role: "armador" },
  { id: "3", name: "Franco", role: "armador" },
  { id: "4", name: "Negro", role: "armador" },
]

export function useSupabase() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si no hay Supabase, usar localStorage como fallback
  const useLocalStorage = !supabase

  // Obtener todos los pedidos
  const fetchOrders = async (): Promise<Order[]> => {
    setLoading(true)
    setError(null)

    try {
      if (useLocalStorage) {
        // Usar localStorage como fallback
        const savedOrders = localStorage.getItem("orders")
        if (savedOrders) {
          const parsedOrders = JSON.parse(savedOrders).map((order: any) => ({
            ...order,
            createdAt: new Date(order.createdAt),
            history: order.history.map((h: any) => ({
              ...h,
              timestamp: new Date(h.timestamp),
            })),
          }))
          return parsedOrders
        }
        return []
      }

      // Código de Supabase (cuando esté configurado)
      const { data: ordersData, error: ordersError } = await supabase!
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError

      const orders: Order[] = []

      for (const orderData of ordersData) {
        // Obtener productos
        const { data: productsData, error: productsError } = await supabase!
          .from("products")
          .select("*")
          .eq("order_id", orderData.id)

        if (productsError) throw productsError

        // Obtener productos faltantes
        const { data: missingData, error: missingError } = await supabase!
          .from("missing_products")
          .select("*")
          .eq("order_id", orderData.id)

        if (missingError) throw missingError

        // Obtener productos devueltos
        const { data: returnedData, error: returnedError } = await supabase!
          .from("returned_products")
          .select("*")
          .eq("order_id", orderData.id)

        if (returnedError) throw returnedError

        // Obtener historial
        const { data: historyData, error: historyError } = await supabase!
          .from("order_history")
          .select("*")
          .eq("order_id", orderData.id)
          .order("created_at", { ascending: true })

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
          products: productsData.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            quantity: Number.parseFloat(p.quantity),
            originalQuantity: p.original_quantity ? Number.parseFloat(p.original_quantity) : undefined,
            isChecked: p.is_checked,
          })),
          missingProducts: missingData.map((m) => ({
            productId: m.product_id,
            productName: m.product_name,
            code: m.code,
            quantity: Number.parseFloat(m.quantity),
          })),
          returnedProducts: returnedData.map((r) => ({
            productId: r.product_id,
            productName: r.product_name,
            code: r.code,
            quantity: Number.parseFloat(r.quantity),
            reason: r.reason,
          })),
          history: historyData.map((h) => ({
            id: h.id,
            action: h.action,
            user: h.user_name,
            timestamp: new Date(h.created_at),
            notes: h.notes,
          })),
        }

        orders.push(order)
      }

      return orders
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      return []
    } finally {
      setLoading(false)
    }
  }

  // Crear nuevo pedido
  const createOrder = async (
    orderData: Omit<
      Order,
      "id" | "createdAt" | "history" | "status" | "missingProducts" | "isPaid" | "returnedProducts"
    >,
    currentUser: User,
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const orderId = `PED-${Date.now()}`

      if (useLocalStorage) {
        // Usar localStorage como fallback
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
              id: Date.now().toString(),
              action: "Presupuesto creado y pedido listo para armar",
              user: currentUser.name,
              timestamp: new Date(),
              notes: orderData.initialNotes || undefined,
            },
          ],
          products: orderData.products.map((p) => ({
            ...p,
            originalQuantity: p.quantity,
            isChecked: false,
          })),
        }

        const savedOrders = localStorage.getItem("orders")
        const orders = savedOrders ? JSON.parse(savedOrders) : []
        orders.push(newOrder)
        localStorage.setItem("orders", JSON.stringify(orders))
        return true
      }

      // Código de Supabase (cuando esté configurado)
      const { error: orderError } = await supabase!.from("orders").insert({
        id: orderId,
        client_name: orderData.clientName,
        client_address: orderData.clientAddress,
        status: "en_armado",
        is_paid: false,
        initial_notes: orderData.initialNotes,
      })

      if (orderError) throw orderError

      const productsToInsert = orderData.products.map((p) => ({
        id: p.id,
        order_id: orderId,
        code: p.code,
        name: p.name,
        quantity: p.quantity,
        original_quantity: p.quantity,
        is_checked: false,
      }))

      const { error: productsError } = await supabase!.from("products").insert(productsToInsert)

      if (productsError) throw productsError

      const { error: historyError } = await supabase!.from("order_history").insert({
        order_id: orderId,
        action: "Presupuesto creado y pedido listo para armar",
        user_name: currentUser.name,
        notes: orderData.initialNotes,
      })

      if (historyError) throw historyError

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear pedido")
      return false
    } finally {
      setLoading(false)
    }
  }

  // Actualizar pedido
  const updateOrder = async (order: Order): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      if (useLocalStorage) {
        // Usar localStorage como fallback
        const savedOrders = localStorage.getItem("orders")
        const orders = savedOrders ? JSON.parse(savedOrders) : []
        const orderIndex = orders.findIndex((o: Order) => o.id === order.id)

        if (orderIndex >= 0) {
          orders[orderIndex] = order
          localStorage.setItem("orders", JSON.stringify(orders))
        }
        return true
      }

      // Código de Supabase (cuando esté configurado)
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
        })
        .eq("id", order.id)

      if (orderError) throw orderError

      // Eliminar productos existentes y reinsertar
      await supabase.from("products").delete().eq("order_id", order.id)

      const productsToInsert = order.products.map((p) => ({
        id: p.id,
        order_id: order.id,
        code: p.code,
        name: p.name,
        quantity: p.quantity,
        original_quantity: p.originalQuantity,
        is_checked: p.isChecked,
      }))

      const { error: productsError } = await supabase.from("products").insert(productsToInsert)

      if (productsError) throw productsError

      // Eliminar y reinsertar productos faltantes
      await supabase.from("missing_products").delete().eq("order_id", order.id)

      if (order.missingProducts.length > 0) {
        const missingToInsert = order.missingProducts.map((m) => ({
          order_id: order.id,
          product_id: m.productId,
          product_name: m.productName,
          code: m.code,
          quantity: m.quantity,
        }))

        const { error: missingError } = await supabase.from("missing_products").insert(missingToInsert)

        if (missingError) throw missingError
      }

      // Eliminar y reinsertar productos devueltos
      await supabase.from("returned_products").delete().eq("order_id", order.id)

      if (order.returnedProducts.length > 0) {
        const returnedToInsert = order.returnedProducts.map((r) => ({
          order_id: order.id,
          product_id: r.productId,
          product_name: r.productName,
          code: r.code,
          quantity: r.quantity,
          reason: r.reason,
        }))

        const { error: returnedError } = await supabase.from("returned_products").insert(returnedToInsert)

        if (returnedError) throw returnedError
      }

      // Insertar nuevas entradas de historial (solo las que no existen)
      const { data: existingHistory } = await supabase.from("order_history").select("id").eq("order_id", order.id)

      const existingIds = new Set(existingHistory?.map((h) => h.id) || [])
      const newHistoryEntries = order.history.filter((h) => !existingIds.has(h.id))

      if (newHistoryEntries.length > 0) {
        const historyToInsert = newHistoryEntries.map((h) => ({
          id: h.id,
          order_id: order.id,
          action: h.action,
          user_name: h.user,
          notes: h.notes,
          created_at: h.timestamp.toISOString(),
        }))

        const { error: historyError } = await supabase.from("order_history").insert(historyToInsert)

        if (historyError) throw historyError
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar pedido")
      return false
    } finally {
      setLoading(false)
    }
  }

  // Eliminar pedido
  const deleteOrder = async (orderId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      if (useLocalStorage) {
        // Usar localStorage como fallback
        const savedOrders = localStorage.getItem("orders")
        const orders = savedOrders ? JSON.parse(savedOrders) : []
        const filteredOrders = orders.filter((o: Order) => o.id !== orderId)
        localStorage.setItem("orders", JSON.stringify(filteredOrders))
        return true
      }

      // Código de Supabase
      const { error } = await supabase!.from("orders").delete().eq("id", orderId)
      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar pedido")
      return false
    } finally {
      setLoading(false)
    }
  }

  // Obtener usuarios
  const fetchUsers = async (): Promise<User[]> => {
    if (useLocalStorage) {
      // Usar usuarios por defecto
      return DEFAULT_USERS
    }

    const { data, error } = await supabase!.from("users").select("*").order("name")

    if (error) {
      setError(error.message)
      return DEFAULT_USERS
    }

    return data.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
    }))
  }

  return {
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    fetchUsers,
  }
}
