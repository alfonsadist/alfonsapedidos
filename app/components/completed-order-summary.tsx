"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Package, AlertTriangle, RotateCcw, DollarSign, User, FileText, Copy, CheckCircle, Clock } from "lucide-react"
import type { Order } from "../page"

interface CompletedOrderSummaryProps {
  order: Order
  onClose: () => void
}

export function CompletedOrderSummary({ order, onClose }: CompletedOrderSummaryProps) {
  const copyToClipboard = () => {
    const summary = `
RESUMEN COMPLETO DEL PEDIDO
===========================

Cliente: ${order.clientName}
ID Pedido: ${order.id}
Dirección: ${order.clientAddress || "No especificada"}
Fecha de Creación: ${order.createdAt.toLocaleDateString()}
Estado Final: Pagado
Método de Pago: ${order.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}

PRODUCTOS ENTREGADOS (${order.products.length}):
${order.products
  .map(
    (p, i) =>
      `${i + 1}. ${p.name}${p.code ? ` (${p.code})` : ""} - Cantidad: ${p.quantity}${
        p.originalQuantity && p.originalQuantity !== p.quantity ? ` (Original: ${p.originalQuantity})` : ""
      }`,
  )
  .join("\n")}

${
  order.missingProducts.length > 0
    ? `PRODUCTOS FALTANTES (${order.missingProducts.length}):
${order.missingProducts
  .map((m, i) => `${i + 1}. ${m.productName}${m.code ? ` (${m.code})` : ""} - Cantidad faltante: ${m.quantity}`)
  .join("\n")}`
    : "✅ No hubo productos faltantes"
}

${
  order.returnedProducts.length > 0
    ? `PRODUCTOS DEVUELTOS (${order.returnedProducts.length}):
${order.returnedProducts
  .map(
    (r, i) =>
      `${i + 1}. ${r.productName}${r.code ? ` (${r.code})` : ""} - Cantidad: ${r.quantity}${
        r.reason ? ` - Motivo: ${r.reason}` : ""
      }`,
  )
  .join("\n")}`
    : "✅ No hubo productos devueltos"
}

HISTORIAL COMPLETO:
${order.history
  .map((h) => `• ${h.timestamp.toLocaleString()} - ${h.user}: ${h.action}${h.notes ? ` (${h.notes})` : ""}`)
  .join("\n")}

PERSONAL INVOLUCRADO:
${order.armedBy ? `• Armado por: ${order.armedBy}` : ""}
${order.controlledBy ? `• Controlado por: ${order.controlledBy}` : ""}

${order.initialNotes ? `OBSERVACIONES INICIALES:\n${order.initialNotes}` : ""}
    `.trim()

    navigator.clipboard.writeText(summary)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Resumen Completo - {order.clientName}
          </DialogTitle>
          <DialogDescription>
            Pedido completado el {order.createdAt.toLocaleDateString()} • ID: {order.id}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Información General */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{order.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID Pedido:</span>
                    <span className="font-mono text-sm">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dirección:</span>
                    <span className="font-medium">{order.clientAddress || "No especificada"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium">{order.createdAt.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Método de Pago:</span>
                    <Badge variant="outline">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {order.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado Final:</span>
                    <Badge className="bg-green-700 text-white">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Pagado
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Productos Entregados */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  Productos Entregados ({order.products.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.products.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        {product.code && <div className="text-sm text-gray-600">Código: {product.code}</div>}
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{product.quantity} unidades</Badge>
                        {product.originalQuantity && product.originalQuantity !== product.quantity && (
                          <div className="text-xs text-gray-500 mt-1">Original: {product.originalQuantity}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Productos Faltantes */}
            {order.missingProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Productos Faltantes ({order.missingProducts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.missingProducts.map((missing, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{missing.productName}</div>
                          {missing.code && <div className="text-sm text-gray-600">Código: {missing.code}</div>}
                        </div>
                        <Badge variant="destructive">{missing.quantity} faltantes</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Productos Devueltos */}
            {order.returnedProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-blue-600" />
                    Productos Devueltos ({order.returnedProducts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.returnedProducts.map((returned, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{returned.productName}</div>
                          {returned.code && <div className="text-sm text-gray-600">Código: {returned.code}</div>}
                          {returned.reason && (
                            <div className="text-sm text-blue-700 mt-1">Motivo: {returned.reason}</div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-blue-600">
                          {returned.quantity} devueltos
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Personal Involucrado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Involucrado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.armedBy && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Armado por:</span>
                      <Badge variant="outline">{order.armedBy}</Badge>
                    </div>
                  )}
                  {order.controlledBy && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Controlado por:</span>
                      <Badge variant="outline">{order.controlledBy}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Historial Completo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Historial Completo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.history.map((entry, index) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{entry.user}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600">{entry.timestamp.toLocaleString()}</span>
                        </div>
                        <div className="text-sm mt-1">{entry.action}</div>
                        {entry.notes && <div className="text-xs text-gray-600 mt-1 italic">{entry.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Observaciones Iniciales */}
            {order.initialNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observaciones Iniciales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{order.initialNotes}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Botones */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={copyToClipboard} className="flex items-center gap-2 bg-transparent">
            <Copy className="w-4 h-4" />
            Copiar Resumen
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
