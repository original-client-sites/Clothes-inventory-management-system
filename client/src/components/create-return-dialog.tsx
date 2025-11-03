import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X, Package, QrCode, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertReturnSchema, type OrderWithItems, type Product } from "@shared/schema";
import { QRScannerDialog } from "@/components/qr-scanner-dialog";
import { z } from "zod";

interface ReturnItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  exchangeProductId?: string;
  exchangeProductName?: string;
}

interface CreateReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithItems | null;
}

export function CreateReturnDialog({ open, onOpenChange, order }: CreateReturnDialogProps) {
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [exchangeProducts, setExchangeProducts] = useState<Record<string, string>>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentExchangeItemId, setCurrentExchangeItemId] = useState<string | null>(null);
  const [manualSearchSKU, setManualSearchSKU] = useState("");
  const [showManualSearch, setShowManualSearch] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm({
    resolver: zodResolver(insertReturnSchema),
    defaultValues: {
      orderId: "",
      orderNumber: "",
      customerName: "",
      customerEmail: "",
      status: "pending" as const,
      reason: "",
      notes: "",
      refundAmount: "0",
      creditAmount: "0",
    },
  });

  useEffect(() => {
    if (order && open) {
      form.setValue("orderId", order.id);
      form.setValue("orderNumber", order.orderNumber);
      form.setValue("customerName", order.customerName);
      form.setValue("customerEmail", order.customerEmail || "");
      setReturnItems(order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: 0,
        unitPrice: item.unitPrice,
        subtotal: "0",
      })));
    }
  }, [order, open]);

  const createReturnMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/returns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/discount-codes"] });
      toast({
        title: "Return Created",
        description: "Return has been created successfully. If there's store credit, a discount code has been sent to the customer's email.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateQuantity = (productId: string, newQuantity: number) => {
    setReturnItems(items =>
      items.map(item => {
        if (item.productId === productId) {
          const quantity = Math.max(0, Math.min(newQuantity, parseInt(item.unitPrice)));
          const subtotal = (quantity * parseFloat(item.unitPrice)).toFixed(2);
          return { ...item, quantity, subtotal };
        }
        return item;
      })
    );
  };

  const setExchangeProduct = (productId: string, exchangeProductId: string) => {
    const exchangeProduct = products.find(p => p.id === exchangeProductId);
    setReturnItems(items =>
      items.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            exchangeProductId: exchangeProductId === "none" ? undefined : exchangeProductId,
            exchangeProductName: exchangeProductId === "none" ? undefined : exchangeProduct?.productName,
          };
        }
        return item;
      })
    );
  };

  const handleScanForExchange = (productId: string) => {
    setCurrentExchangeItemId(productId);
    setIsScannerOpen(true);
  };

  const handleProductScanned = (product: Product) => {
    if (currentExchangeItemId) {
      setExchangeProduct(currentExchangeItemId, product.id);
      setIsScannerOpen(false);
      setCurrentExchangeItemId(null);
    }
  };

  const handleManualSearch = (productId: string) => {
    if (!manualSearchSKU.trim()) return;
    
    const product = products.find(p => p.sku === manualSearchSKU.trim());
    if (product) {
      setExchangeProduct(productId, product.id);
      setManualSearchSKU("");
      setShowManualSearch(null);
      toast({
        title: "Product Found",
        description: `${product.productName} selected for exchange`,
      });
    } else {
      toast({
        title: "Product Not Found",
        description: `No product found with SKU: ${manualSearchSKU}`,
        variant: "destructive",
      });
    }
  };

  const calculateTotals = () => {
    const itemsToReturn = returnItems.filter(item => item.quantity > 0);
    
    let totalReturnValue = 0;
    let totalExchangeValue = 0;

    itemsToReturn.forEach(item => {
      const returnValue = parseFloat(item.subtotal);
      totalReturnValue += returnValue;

      if (item.exchangeProductId) {
        const exchangeProduct = products.find(p => p.id === item.exchangeProductId);
        if (exchangeProduct) {
          totalExchangeValue += parseFloat(exchangeProduct.price) * item.quantity;
        }
      }
    });

    const refundAmount = totalExchangeValue > 0 ? 0 : totalReturnValue;
    const creditAmount = totalReturnValue > totalExchangeValue 
      ? (totalReturnValue - totalExchangeValue)
      : 0;

    return { total: totalReturnValue, refund: refundAmount, credit: creditAmount };
  };

  const onSubmit = form.handleSubmit((data) => {
    const itemsToReturn = returnItems.filter(item => item.quantity > 0);

    if (itemsToReturn.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to return",
        variant: "destructive",
      });
      return;
    }

    const { refund, credit } = calculateTotals();

    createReturnMutation.mutate({
      ...data,
      refundAmount: refund.toFixed(2),
      creditAmount: credit.toFixed(2),
      items: itemsToReturn,
    });
  });

  const { total, refund, credit } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create Return</DialogTitle>
          <DialogDescription>
            Process a return or exchange for order {order?.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Return Items</h3>
            <div className="space-y-3">
              {returnItems.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">{item.sku}</p>
                        <p className="text-sm">Price: ${item.unitPrice}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div>
                          <Label className="text-xs">Return Qty</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-12 text-center">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        {item.quantity > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs">Exchange For</Label>
                            {item.exchangeProductId ? (
                              <div className="flex items-center gap-2">
                                <div className="text-sm bg-muted px-3 py-2 rounded flex-1">
                                  {item.exchangeProductName}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExchangeProduct(item.productId, "none")}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : showManualSearch === item.productId ? (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Enter SKU..."
                                    value={manualSearchSKU}
                                    onChange={(e) => setManualSearchSKU(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleManualSearch(item.productId);
                                      }
                                    }}
                                    className="h-8"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleManualSearch(item.productId)}
                                  >
                                    <Search className="h-4 w-4" />
                                  </Button>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setShowManualSearch(null);
                                    setManualSearchSKU("");
                                  }}
                                  className="w-full"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleScanForExchange(item.productId)}
                                  className="flex-1"
                                >
                                  <QrCode className="h-4 w-4 mr-2" />
                                  Scan
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowManualSearch(item.productId)}
                                  className="flex-1"
                                >
                                  <Search className="h-4 w-4 mr-2" />
                                  Search
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Return Details</h3>

            <div className="space-y-2">
              <Label htmlFor="reason">Return Reason *</Label>
              <Select
                value={form.watch("reason")}
                onValueChange={(value) => form.setValue("reason", value)}
              >
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defective">Defective/Damaged</SelectItem>
                  <SelectItem value="wrong_item">Wrong Item</SelectItem>
                  <SelectItem value="wrong_size">Wrong Size</SelectItem>
                  <SelectItem value="not_as_described">Not as Described</SelectItem>
                  <SelectItem value="customer_changed_mind">Changed Mind</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Add any additional details..."
                rows={3}
              />
            </div>
          </div>

          {returnItems.some(item => item.quantity > 0) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Return Summary</h3>
                {(() => {
                  const itemsToReturn = returnItems.filter(item => item.quantity > 0);
                  let totalReturnValue = 0;
                  let totalExchangeValue = 0;

                  itemsToReturn.forEach(item => {
                    totalReturnValue += parseFloat(item.subtotal);
                    if (item.exchangeProductId) {
                      const exchangeProduct = products.find(p => p.id === item.exchangeProductId);
                      if (exchangeProduct) {
                        totalExchangeValue += parseFloat(exchangeProduct.price) * item.quantity;
                      }
                    }
                  });

                  const creditAmount = totalReturnValue > totalExchangeValue 
                    ? (totalReturnValue - totalExchangeValue)
                    : 0;

                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Return Value:</span>
                        <span className="font-medium">${totalReturnValue.toFixed(2)}</span>
                      </div>
                      {totalExchangeValue > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Exchange Value:</span>
                          <span className="font-medium">${totalExchangeValue.toFixed(2)}</span>
                        </div>
                      )}
                      {creditAmount > 0 && (
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold">Store Credit:</span>
                          <span className="font-semibold text-green-600">${creditAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {totalExchangeValue === 0 && (
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold">Refund Amount:</span>
                          <span className="font-semibold">${totalReturnValue.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createReturnMutation.isPending || total === 0}>
              {createReturnMutation.isPending ? "Creating..." : "Create Return"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <QRScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onProductScanned={handleProductScanned}
      />
    </Dialog>
  );
}