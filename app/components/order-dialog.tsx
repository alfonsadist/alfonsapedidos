"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Plus, Trash2, AlertCircle, DollarSign } from "lucide-react"
import type { Order, Product } from "../page"

interface OrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateOrder: (
    order: Omit<
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
  ) => void
}

export function OrderDialog({ open, onOpenChange, onCreateOrder }: OrderDialogProps) {
  const [clientName, setClientName] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [products, setProducts] = useState<Product[]>([
    { id: "1", name: "", quantity: 1, originalQuantity: 1, isChecked: false },
  ])
  const [initialNotes, setInitialNotes] = useState("")
  const [textInput, setTextInput] = useState("")
  const [isProcessingText, setIsProcessingText] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)

  const resetForm = () => {
    setClientName("")
    setClientAddress("")
    setProducts([{ id: "1", name: "", quantity: 1, originalQuantity: 1, isChecked: false }])
    setInitialNotes("")
    setTextInput("")
    setIsProcessingText(false)
    setTextError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validProducts = products.filter((p) => p.name.trim() && p.quantity > 0)
    if (!clientName.trim() || validProducts.length === 0) {
      alert("Por favor completa el nombre del cliente y al menos un producto")
      return
    }

    const totalAmount = validProducts.reduce((sum, product) => sum + (product.subtotal || 0), 0)

    onCreateOrder({
      clientName: clientName.trim(),
      clientAddress: clientAddress.trim(),
      products: validProducts.map((p) => ({
        ...p,
        originalQuantity: p.quantity,
        isChecked: false,
      })),
      paymentMethod: undefined,
      initialNotes: initialNotes.trim() || undefined,
      totalAmount: totalAmount > 0 ? totalAmount : undefined,
    })

    resetForm()
  }

  const addProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      name: "",
      quantity: 1,
      originalQuantity: 1,
      isChecked: false,
    }
    setProducts([...products, newProduct])
  }

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter((p) => p.id !== id))
    }
  }

  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  // parseo de precios en formato argentino (16.008,00 => 16008.00)
  const parsePrice = (priceStr: string): number => {
    let cleanPrice = priceStr.replace(/[$\s]/g, "")
    // Reemplaza coma decimal (última coma) por punto
    const lastComma = cleanPrice.lastIndexOf(",")
    if (lastComma !== -1) {
      cleanPrice = cleanPrice.substring(0, lastComma) + "." + cleanPrice.substring(lastComma + 1)
    }
    // Quitar puntos miles (todos los puntos excepto el último si existiera)
    const parts = cleanPrice.split(".")
    if (parts.length > 2) {
      const integerPart = parts.slice(0, -1).join("")
      const decimalPart = parts[parts.length - 1]
      cleanPrice = integerPart + "." + decimalPart
    }
    return Number.parseFloat(cleanPrice) || 0
  }

  const parseProductLine = (line: string): Product | null => {
    // Separar precios
    const priceParts = line.split("$").map((p) => p.trim()).filter((p) => p !== "")
    let unitPrice: number | undefined = undefined
    let subtotal: number | undefined = undefined

    if (priceParts.length >= 2) {
      // primer precio después del $ es unitario, el siguiente es subtotal
      unitPrice = parsePrice(priceParts[1])
      if (priceParts.length >= 3) {
        subtotal = parsePrice(priceParts[2])
      }
    }

    // Parte antes del primer $
    const beforePrice = line.split("$")[0].trim()
    // Remover encabezados si vinieran
    const cleanLine = beforePrice.replace(/Cajas\s+Unid\s+Codigo\s+Articulo/i, "").trim()

    // 1) Combo con extra: "1 (x12) 11 376 RON HAVANA 3 AÑOS 750CC"
    const comboWithExtra = /^(\d+)\s*\(x(\d+)\)\s+(\d+)\s+(\d+)\s+(.+)$/i
    let match = cleanLine.match(comboWithExtra)
    if (match) {
      const [_, cajasStr, porCajaStr, extraStr, codigo, articulo] = match
      const cajas = Number(cajasStr)
      const porCaja = Number(porCajaStr)
      const extra = Number(extraStr)
      const totalQty = cajas * porCaja + extra
      return {
        id: `parsed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        code: codigo,
        name: articulo.trim(),
        quantity: totalQty,
        originalQuantity: totalQty,
        isChecked: false,
        unitPrice: unitPrice && unitPrice > 0 ? unitPrice : undefined,
        subtotal: subtotal && subtotal > 0 ? subtotal : undefined,
      }
    }

    // 2) Solo cajas: "50 (x9) 7667 AGUA CELLIER SIN GAS 600CC"
    const onlyCajas = /^(\d+)\s*\(x(\d+)\)\s+(\d+)\s+(.+)$/i
    match = cleanLine.match(onlyCajas)
    if (match) {
      const [_, cajasStr, porCajaStr, codigo, articulo] = match
      const cajas = Number(cajasStr)
      const porCaja = Number(porCajaStr)
      const totalQty = cajas * porCaja
      return {
        id: `parsed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        code: codigo,
        name: articulo.trim(),
        quantity: totalQty,
        originalQuantity: totalQty,
        isChecked: false,
        unitPrice: unitPrice && unitPrice > 0 ? unitPrice : undefined,
        subtotal: subtotal && subtotal > 0 ? subtotal : undefined,
      }
    }

    // 3) Solo unidades simples: "6 859 ABSOLUT APEACH 700CC"
    const simplePattern = /^(\d+)\s+(\d+)\s+(.+)$/i
    match = cleanLine.match(simplePattern)
    if (match) {
      const [_, qtyStr, codigo, articulo] = match
      const qty = Number(qtyStr)
      return {
        id: `parsed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        code: codigo,
        name: articulo.trim(),
        quantity: qty,
        originalQuantity: qty,
        isChecked: false,
        unitPrice: unitPrice && unitPrice > 0 ? unitPrice : undefined,
        subtotal: subtotal && subtotal > 0 ? subtotal : undefined,
      }
    }

    console.warn("No se pudo parsear línea:", line)
    return null
  }

  const processTextContent = (text: string) => {
    setIsProcessingText(true)
    setTextError(null)

    try {
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .filter((l) => !/Cajas\s+Unid\s+Codigo\s+Articulo/i.test(l))

      const extractedProducts: Product[] = []

      for (const line of lines) {
        const product = parseProductLine(line)
        if (product) {
          extractedProducts.push(product)
        }
      }

      if (extractedProducts.length > 0) {
        setProducts(extractedProducts)
        setTextError(null)
      } else {
        setTextError("No se pudieron extraer productos del texto. Verifica el formato."); 
      }
    } catch (error) {
      setTextError(`Error al procesar el texto: ${error instanceof Error ? error.message : "Desconocido"}`)
    } finally {
      setIsProcessingText(false)
    }
  }

  const handleProcessText = () => {
    if (!textInput.trim()) {
      setTextError("Por favor ingresa el texto con los productos")
      return
    }
    setProducts([{ id: "1", name: "", quantity: 1, originalQuantity: 1, isChecked: false }])
    processTextContent(textInput)
  }

  const clearText = () => {
    setTextInput("")
    setTextError(null)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(price)
  }

  const calculateTotal = () => {
    return products.reduce((sum, product) => sum + (product.subtotal || 0), 0)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm()
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Presupuesto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Datos del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">Nombre del Cliente *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="clientAddress">Dirección</Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Dirección de entrega"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="initialNotes">Observaciones Iniciales</Label>
            <Textarea
              id="initialNotes"
              value={initialNotes}
              onChange={(e) => setInitialNotes(e.target.value)}
              placeholder="Ej: pueden faltar 10 unidades de la flota Malbec fijense..."
              rows={3}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Cargar Productos desde Texto</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="textInput">Pega aquí el texto copiado del PDF</Label>
                <Textarea
                  id="textInput"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Pega aquí el texto del PDF..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleProcessText}
                  disabled={isProcessingText || !textInput.trim()}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {isProcessingText ? "Procesando..." : "Procesar Texto"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={clearText}
                  className="flex items-center gap-2 bg-transparent"
                >
                  Limpiar Texto
                </Button>
              </div>
            </div>

            {textError && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
                <AlertCircle className="w-4 h-4" />
                <span>{textError}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Productos ({products.length})</h3>
              <Button
                type="button"
                onClick={addProduct}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
              >
                <Plus className="w-4 h-4" />
                Agregar Producto
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 mb-2 text-sm font-medium text-gray-600 px-2 py-2 bg-gray-50 rounded border">
                <div className="col-span-1">Código</div>
                <div className="col-span-4">Producto</div>
                <div className="col-span-1 text-center">Cantidad</div>
                <div className="col-span-2 text-right">P. Unitario</div>
                <div className="col-span-3 text-right">Subtotal</div>
                <div className="col-span-1 text-center">Acción</div>
              </div>

              {products.map((product) => (
                <div key={product.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                  <div className="col-span-1">
                    <Input
                      value={product.code || ""}
                      onChange={(e) => updateProduct(product.id, "code", e.target.value)}
                      placeholder="Código"
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="col-span-4">
                    <Input
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                      placeholder="Nombre del producto"
                      className="text-sm h-8"
                      required
                    />
                  </div>

                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => updateProduct(product.id, "quantity", Number.parseFloat(e.target.value) || 1)}
                      min="0.01"
                      step="0.01"
                      className="text-sm h-8 text-center"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    {product.unitPrice ? (
                      <div className="text-sm text-green-600 font-medium px-2 py-1 bg-green-50 rounded text-right">
                        {formatPrice(product.unitPrice)}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 px-2 py-1 text-center">-</div>
                    )}
                  </div>

                  <div className="col-span-3">
                    {product.subtotal ? (
                      <div className="text-sm text-green-700 font-bold px-2 py-1 bg-green-100 rounded text-right">
                        {formatPrice(product.subtotal)}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 px-2 py-1 text-center">-</div>
                    )}
                  </div>

                  <div className="col-span-1 text-center">
                    {products.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 p-1 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {calculateTotal() > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-lg font-semibold text-green-800">Total del Presupuesto:</span>
                  </div>
                  <span className="text-2xl font-bold text-green-700">{formatPrice(calculateTotal())}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isProcessingText}>
              Crear Presupuesto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
