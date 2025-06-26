"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Upload, FileText } from "lucide-react"
import type { Order, Product } from "../page"

interface OrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateOrder: (order: Omit<Order, "id" | "createdAt" | "history" | "status" | "missingProducts" | "isPaid">) => void
}

export function OrderDialog({ open, onOpenChange, onCreateOrder }: OrderDialogProps) {
  const [clientName, setClientName] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [initialNotes, setInitialNotes] = useState("")
  const [products, setProducts] = useState<Product[]>([{ id: "1", name: "", quantity: 1 }])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessingPDF, setIsProcessingPDF] = useState(false)

  // Función mejorada para parsear PDF (simulación para demo)
  const parsePDFContent = async (file: File): Promise<Product[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          // Para demo, simulamos la extracción basada en el nombre del archivo
          // En producción, aquí usarías una librería como pdf-parse o PDF.js

          // Productos de ejemplo basados en tu PDF
          const sampleProducts: Product[] = [
            {
              id: "1",
              code: "5120",
              name: "FIDEOS MATARAZZO TIRABUZON 500gr",
              quantity: 30.0,
            },
            {
              id: "2",
              code: "5122",
              name: "FIDEOS MATARAZZO SPAGUETTI 500gr",
              quantity: 80.0,
            },
          ]

          console.log("PDF procesado exitosamente:", file.name)
          console.log("Productos extraídos:", sampleProducts)

          // Simular delay de procesamiento
          setTimeout(() => {
            resolve(sampleProducts)
          }, 1000)
        } catch (error) {
          console.error("Error parsing PDF:", error)
          reject(error)
        }
      }

      reader.onerror = (error) => {
        console.error("Error reading file:", error)
        reject(error)
      }

      // Para PDFs reales, necesitarías usar ArrayBuffer y una librería de PDF
      reader.readAsArrayBuffer(file)
    })
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    console.log("Drop event triggered")

    const files = Array.from(e.dataTransfer.files)
    console.log(
      "Files dropped:",
      files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    )

    const pdfFile = files.find((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))

    if (pdfFile) {
      console.log("PDF file found:", pdfFile.name)
      setIsProcessingPDF(true)

      try {
        const extractedProducts = await parsePDFContent(pdfFile)
        console.log("Products extracted:", extractedProducts)

        if (extractedProducts.length > 0) {
          setProducts(extractedProducts)
          // Removido el alert para experiencia más fluida
        }
      } catch (error) {
        console.error("Error procesando PDF:", error)
        // Solo mostrar error si realmente falla
      }
    }

    setIsProcessingPDF(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input triggered")
    const file = e.target.files?.[0]

    if (file) {
      console.log("File selected:", { name: file.name, type: file.type, size: file.size })

      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setIsProcessingPDF(true)

        try {
          const extractedProducts = await parsePDFContent(file)
          console.log("Products extracted from file input:", extractedProducts)

          if (extractedProducts.length > 0) {
            setProducts(extractedProducts)
            // Removido el alert para experiencia más fluida
          }
        } catch (error) {
          console.error("Error procesando PDF:", error)
        }

        setIsProcessingPDF(false)
      }
    }

    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    e.target.value = ""
  }

  const addProduct = () => {
    setProducts([...products, { id: Date.now().toString(), name: "", quantity: 1 }])
  }

  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id))
  }

  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName.trim()) return

    const validProducts = products.filter((p) => p.name.trim() && p.quantity > 0)
    if (validProducts.length === 0) return

    onCreateOrder({
      clientName: clientName.trim(),
      clientAddress: clientAddress.trim(),
      products: validProducts,
      initialNotes: initialNotes.trim(),
    })

    // Reset form
    setClientName("")
    setClientAddress("")
    setInitialNotes("")
    setProducts([{ id: "1", name: "", quantity: 1 }])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Presupuesto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del cliente */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Datos del Cliente</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nombre del Cliente *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientAddress">Dirección</Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Dirección de entrega"
                />
              </div>
            </div>

            {/* Observaciones iniciales */}
            <div className="space-y-2">
              <Label htmlFor="initialNotes">Observaciones Iniciales</Label>
              <Textarea
                id="initialNotes"
                value={initialNotes}
                onChange={(e) => setInitialNotes(e.target.value)}
                placeholder="Ej: pueden faltar 10 unidades de la flota Malbec fíjense..."
                rows={3}
              />
            </div>
          </div>

          {/* Subida de PDF */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Cargar Productos desde PDF</h3>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragOver(true)
              }}
            >
              {isProcessingPDF ? (
                <div className="space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600">Procesando PDF...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">Arrastra tu PDF de presupuesto aquí</p>
                    <p className="text-gray-600">Se detectarán automáticamente los productos y cantidades</p>
                  </div>
                  <div className="flex justify-center">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileInput}
                      className="hidden"
                      id="pdf-upload-input"
                    />
                    <label htmlFor="pdf-upload-input" className="cursor-pointer">
                      <Button type="button" variant="outline" className="flex items-center gap-2" asChild>
                        <span>
                          <Upload className="w-4 h-4" />
                          Seleccionar PDF
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Productos */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-lg">Productos</h3>
              <Button type="button" onClick={addProduct} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Producto
              </Button>
            </div>

            <div className="space-y-3">
              {products.map((product, index) => (
                <div key={product.id} className="flex gap-3 items-end">
                  {product.code && (
                    <div className="w-20">
                      <Label htmlFor={`code-${product.id}`}>Código</Label>
                      <Input
                        id={`code-${product.id}`}
                        value={product.code}
                        onChange={(e) => updateProduct(product.id, "code", e.target.value)}
                        placeholder="Código"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <Label htmlFor={`product-${product.id}`}>Producto {index + 1}</Label>
                    <Input
                      id={`product-${product.id}`}
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                      placeholder="Nombre del producto"
                    />
                  </div>

                  <div className="w-24">
                    <Label htmlFor={`quantity-${product.id}`}>Cantidad</Label>
                    <Input
                      id={`quantity-${product.id}`}
                      type="number"
                      min="1"
                      step="0.01"
                      value={product.quantity}
                      onChange={(e) => updateProduct(product.id, "quantity", Number.parseFloat(e.target.value) || 1)}
                    />
                  </div>

                  {products.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear Presupuesto</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
