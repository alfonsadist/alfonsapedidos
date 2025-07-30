"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Plus, Trash2, AlertCircle } from "lucide-react"
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

  // Función corregida para parsear una línea de texto del formato especificado
const parseProductLine = (line: string): Product | null => {
  // 1) Limpia precios y guiones finales
  const cleanLine = line
    .split("$")[0]
    .trim()
    .replace(/\s*-\s*$/, "")

  // 2) Patrón para cajas + unidades sueltas
  const comboPattern = /^(\d+)\s*\(x(\d+)\)\s+(\d+)\s+(\d+)\s+(.+)$/i
  let match = cleanLine.match(comboPattern)
  if (match) {
    const [_, cajas, porCaja, extra, codigo, articulo] = match
    const total = Number(cajas) * Number(porCaja) + Number(extra)
    return {
      // ahora
id: `parsed-${Date.now()}-${Math.random().toString(36).slice(2)}`,

      code: codigo,
      name: articulo.trim(),
      quantity: total,
      originalQuantity: total,
      isChecked: false,
    }
  }

  // 3) Patrón para solo cajas
  const cajasPattern = /^(\d+)\s*\(x(\d+)\)\s+(\d+)\s+(.+)$/i
  match = cleanLine.match(cajasPattern)
  if (match) {
    const [_, cajas, porCaja, codigo, articulo] = match
    const total = Number(cajas) * Number(porCaja)
    return {
      // ahora
id: `parsed-${Date.now()}-${Math.random().toString(36).slice(2)}`,

      code: codigo,
      name: articulo.trim(),
      quantity: total,
      originalQuantity: total,
      isChecked: false,
    }
  }

  // 4) Patrón para solo unidades
  const simplePattern = /^(\d+)\s+(\d+)\s+(.+)$/i
  match = cleanLine.match(simplePattern)
  if (match) {
    const [_, qty, codigo, articulo] = match
    const total = Number(qty)
    return {
      // ahora
id: `parsed-${Date.now()}-${Math.random().toString(36).slice(2)}`,

      code: codigo,
      name: articulo.trim(),
      quantity: total,
      originalQuantity: total,
      isChecked: false,
    }
  }

  // 5) Si nada casó...
  console.warn("No se pudo parsear:", line)
  return null
}

  // Función para procesar el texto pegado
  const processTextContent = (text: string) => {
    console.log("🔍 Procesando contenido del texto...")
    setIsProcessingText(true)
    setTextError(null)

    try {
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => !line.includes("Cajas Unid Codigo Articulo")) // Filtrar encabezado

      console.log(`📄 Procesando ${lines.length} líneas...`)

      const extractedProducts: Product[] = []

      for (const line of lines) {
        const product = parseProductLine(line)
        if (product) {
          extractedProducts.push(product)
          console.log(`✅ Producto agregado: ${product.name} - Código: ${product.code} - Cantidad: ${product.quantity}`)
        }
      }

      console.log(`🎉 Resumen: ${extractedProducts.length} productos extraídos`)

      if (extractedProducts.length > 0) {
        setProducts(extractedProducts)
        setTextError(null)
        console.log("✅ Productos cargados en el estado")
      } else {
        setTextError("No se pudieron extraer productos del texto. Verifica que el formato sea correcto.")
        console.log("❌ No se cargaron productos")
      }
    } catch (error) {
      console.error("❌ Error procesando texto:", error)
      setTextError(`Error al procesar el texto: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsProcessingText(false)
    }
  }

  const handleProcessText = () => {
    if (!textInput.trim()) {
      setTextError("Por favor ingresa el texto con los productos")
      return
    }

    // Reset productos antes de procesar
    setProducts([{ id: "1", name: "", quantity: 1, originalQuantity: 1, isChecked: false }])
    processTextContent(textInput)
  }

  const clearText = () => {
    setTextInput("")
    setTextError(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm()
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Presupuesto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del Cliente */}
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

          {/* Observaciones Iniciales */}
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

          {/* Cargar Productos desde Texto */}
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

            {/* Error del texto */}
            {textError && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
                <AlertCircle className="w-4 h-4" />
                <span>{textError}</span>
              </div>
            )}
          </div>

          {/* Productos */}
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

            {/* Encabezados de tabla */}
            <div className="grid grid-cols-12 gap-2 mb-2 text-sm font-medium text-gray-600 px-2">
              <div className="col-span-2">Código</div>
              <div className="col-span-7">Producto</div>
              <div className="col-span-2">Cantidad Total</div>
              <div className="col-span-1"></div>
            </div>

            {/* Lista de productos */}
            <div className="space-y-2">
              {products.map((product, index) => (
                <div key={product.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                  <div className="col-span-2">
                    <Input
                      value={product.code || ""}
                      onChange={(e) => updateProduct(product.id, "code", e.target.value)}
                      placeholder="Código"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-7">
                    <Input
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                      placeholder="Nombre del producto"
                      className="text-sm"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => updateProduct(product.id, "quantity", Number.parseFloat(e.target.value) || 1)}
                      min="0.01"
                      step="0.01"
                      className="text-sm"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    {products.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones */}
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
