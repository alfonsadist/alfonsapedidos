"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, CheckCircle, AlertTriangle, FileText } from "lucide-react"
import type { Order } from "../page"
import { useState } from "react"

interface CompletedOrderSummaryProps {
  order: Order
  onClose: () => void
}

export function CompletedOrderSummary({ order, onClose }: CompletedOrderSummaryProps) {
  const [copyMessage, setCopyMessage] = useState("")

  // Formatear precio en pesos argentinos
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(price)
  }

  // Calcular total de productos
  const calculateProductsTotal = (products: any[]) => {
    return products.reduce((sum, product) => {
      if (product.unitPrice && product.quantity) {
        return sum + product.unitPrice * product.quantity
      }
      return sum + (product.subtotal || 0)
    }, 0)
  }

  const copyCompleteSummary = () => {
    const finalProducts = order.products.filter((p) => p.quantity > 0)
    const summaryText = [
      `PEDIDO COMPLETADO - ${order.clientName}`,
      `ID: ${order.id}`,
      `Fecha: ${order.createdAt.toLocaleDateString()}`,
      `Estado: Pagado con ${order.paymentMethod}`,
      "",
      "PRODUCTOS ENTREGADOS:",
      ...finalProducts.map((p) => {
        let line = `${p.code ? `${p.code} - ` : ""}${p.name}: ${p.quantity}`
        if (p.unitPrice) {
          line += ` - ${formatPrice(p.unitPrice)} c/u = ${formatPrice(p.unitPrice * p.quantity)}`
        }
        return line
      }),
      "",
      ...(order.missingProducts.length > 0 ? ["FALTANTES:"] : []),
      ...order.missingProducts.map((m) => `${m.code ? `${m.code} - ` : ""}${m.productName}: ${m.quantity}`),
      "",
      ...(order.returnedProducts.length > 0 ? ["PRODUCTOS DEVUELTOS:"] : []),
      ...order.returnedProducts.map(
        (r) =>
          `${r.code ? `${r.code} - ` : ""}${r.productName}: ${r.quantity} - ${r.reason || "Sin razón especificada"}`,
      ),
      "",
      ...(order.totalAmount ? [`TOTAL FACTURADO: ${formatPrice(order.totalAmount)}`] : []),
    ]
      .filter((line) => line !== "")
      .join("\n")

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopyMessage("Resumen completo copiado")
      setTimeout(() => setCopyMessage(""), 2000)
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl">{order.clientName}</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">ID: {order.id}</p>
              {copyMessage && <p className="text-sm text-green-600 mt-1">✓ {copyMessage}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className="bg-emerald-500 text-white flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Pagado
              </Badge>
              <Badge variant="outline" className="text-xs">
                {order.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}
              </Badge>
              {/* Mostrar total */}
              {order.totalAmount && (
                <div className="text-right">
                  <p className="text-sm text-green-600 font-medium">Total:</p>
                  <p className="text-lg font-bold text-green-700">{formatPrice(order.totalAmount)}</p>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del cliente */}
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
              <div>
                <span className="font-medium">Completado:</span>{" "}
                {order.history[order.history.length - 1]?.timestamp.toLocaleString()}
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
            </CardContent>
          </Card>

          {/* Productos entregados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Productos Entregados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.products
                  .filter((p) => p.quantity > 0)
                  .map((product) => (
                    <div key={product.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {product.code && (
                          <Badge variant="outline" className="text-xs">
                            {product.code}
                          </Badge>
                        )}
                        <span className="font-medium">{product.name}</span>
                        {product.unitPrice && (
                          <span className="text-sm text-green-600">- {formatPrice(product.unitPrice)} c/u</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{product.quantity}</Badge>
                        {product.unitPrice && (
                          <span className="text-sm font-medium text-green-700">
                            = {formatPrice(product.unitPrice * product.quantity)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Total de productos */}
              {calculateProductsTotal(order.products) > 0 && (
                <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-800">Total de Productos:</span>
                    <span className="text-lg font-bold text-green-700">
                      {formatPrice(calculateProductsTotal(order.products))}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Faltantes */}
          {order.missingProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Faltantes ({order.missingProducts.length})
                </CardTitle>
              </CardHeader>
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
            </Card>
          )}

          {/* Productos devueltos */}
          {order.returnedProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  Productos Devueltos ({order.returnedProducts.length})
                </CardTitle>
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

          {/* Historial resumido */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historial del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {order.history.map((entry) => (
                  <div key={entry.id} className="border-l-2 border-green-200 pl-4 pb-3">
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

        {/* Botones de acción */}
        <div className="flex justify-between pt-4">
          <Button onClick={copyCompleteSummary} variant="outline" className="flex items-center gap-2 bg-transparent">
            <FileText className="w-4 h-4" />
            Copiar Resumen Completo
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
