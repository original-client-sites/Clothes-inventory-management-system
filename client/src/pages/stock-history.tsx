import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, RefreshCw, Package, QrCode, ShoppingCart, Truck, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QRScannerDialog } from "@/components/qr-scanner-dialog";
import { StockMovementDialog } from "@/components/stock-movement-dialog";
import type { StockMovement, Product } from "@shared/schema";
import { format } from "date-fns";

type SortField = "productName" | "sku" | "category" | "available" | "purchased" | "sold";
type SortOrder = "asc" | "desc";

export default function StockHistory() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortField, setSortField] = useState<SortField>("productName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: movements = [], isLoading } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalPurchased = movements
      .filter(m => m.type === "in")
      .reduce((sum, m) => sum + m.quantity, 0);
    
    const totalSold = movements
      .filter(m => m.type === "out")
      .reduce((sum, m) => sum + m.quantity, 0);
    
    const totalAvailable = products.reduce((sum, p) => sum + p.stockQuantity, 0);

    return {
      available: totalAvailable,
      sold: totalSold,
      purchased: totalPurchased,
    };
  }, [movements, products]);

  // Calculate per-product statistics
  const productStats = useMemo(() => {
    return products.map(product => {
      const purchased = movements
        .filter(m => m.productId === product.id && m.type === "in")
        .reduce((sum, m) => sum + m.quantity, 0);
      
      const sold = movements
        .filter(m => m.productId === product.id && m.type === "out")
        .reduce((sum, m) => sum + m.quantity, 0);

      return {
        ...product,
        purchased,
        sold,
        available: product.stockQuantity,
      };
    });
  }, [products, movements]);

  // Get unique categories
  const categories = useMemo(() => {
    return ["all", ...new Set(products.map(p => p.category))];
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = productStats;

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "productName":
          aValue = a.productName.toLowerCase();
          bValue = b.productName.toLowerCase();
          break;
        case "sku":
          aValue = a.sku.toLowerCase();
          bValue = b.sku.toLowerCase();
          break;
        case "category":
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case "available":
          aValue = a.available;
          bValue = b.available;
          break;
        case "purchased":
          aValue = a.purchased;
          bValue = b.purchased;
          break;
        case "sold":
          aValue = a.sold;
          bValue = b.sold;
          break;
        default:
          aValue = a.productName.toLowerCase();
          bValue = b.productName.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [productStats, categoryFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "in":
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case "out":
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case "adjustment":
        return <RefreshCw className="h-5 w-5 text-blue-600" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "in":
        return "default" as const;
      case "out":
        return "destructive" as const;
      case "adjustment":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  const handleScan = (scannedData: string) => {
    // Assuming the scanned data is a product SKU or ID
    // You might need to fetch product details based on this scanned data
    console.log("Scanned data:", scannedData);
    // For now, let's assume we can directly use it to open the stock movement dialog
    // In a real scenario, you'd fetch product details here
    setSelectedProduct({ id: scannedData, name: `Product ${scannedData}`, sku: scannedData }); // Mock product data
    setIsStockDialogOpen(true);
    setIsScannerOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Stock Movement History
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track all inventory movements and changes
              </p>
            </div>
            <Button
              onClick={() => setIsScannerOpen(true)}
              data-testid="button-scan-for-stock"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan to Update Stock
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Available Stock
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-available">
                  {statistics.available.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total units in inventory
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Purchased
                </CardTitle>
                <Truck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-purchased">
                  {statistics.purchased.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Units added to inventory
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sold
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="stat-sold">
                  {statistics.sold.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Units removed from inventory
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Product Stock Table */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle>Product Stock Overview</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category === "all" ? "All Categories" : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("productName")}
                          className="hover:bg-transparent p-0 h-auto font-medium"
                        >
                          Product Name
                          <SortIcon field="productName" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("sku")}
                          className="hover:bg-transparent p-0 h-auto font-medium"
                        >
                          SKU
                          <SortIcon field="sku" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("category")}
                          className="hover:bg-transparent p-0 h-auto font-medium"
                        >
                          Category
                          <SortIcon field="category" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("available")}
                          className="hover:bg-transparent p-0 h-auto font-medium ml-auto flex"
                        >
                          Available
                          <SortIcon field="available" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("purchased")}
                          className="hover:bg-transparent p-0 h-auto font-medium ml-auto flex"
                        >
                          Purchased
                          <SortIcon field="purchased" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("sold")}
                          className="hover:bg-transparent p-0 h-auto font-medium ml-auto flex"
                        >
                          Sold
                          <SortIcon field="sold" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedProducts.map((product) => (
                        <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">{product.productName}</TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${
                              product.available === 0 
                                ? "text-red-600" 
                                : product.available < 10 
                                ? "text-yellow-600" 
                                : "text-green-600"
                            }`}>
                              {product.available}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600 font-semibold">{product.purchased}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-red-600 font-semibold">{product.sold}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Stock Movement History */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Movement History</h2>
            <p className="text-sm text-muted-foreground" data-testid="text-movement-count">
              {movements.length} {movements.length === 1 ? "movement" : "movements"}
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : movements.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <TrendingUp className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-state">
                  No stock movements yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Stock movements will appear here as you manage your inventory
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {movements.map((movement) => (
                <Card key={movement.id} className="hover-elevate" data-testid={`card-movement-${movement.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-muted p-3 flex items-center justify-center flex-shrink-0">
                        {getIcon(movement.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg" data-testid={`text-product-${movement.id}`}>
                              {movement.productName}
                            </h3>
                            <p className="text-sm text-muted-foreground font-mono">
                              SKU: {movement.sku}
                            </p>
                          </div>
                          <Badge variant={getBadgeVariant(movement.type)} data-testid={`badge-type-${movement.id}`}>
                            {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Quantity</p>
                            <p className="font-semibold" data-testid={`text-quantity-${movement.id}`}>
                              {movement.type === "adjustment" ? "Set to " : ""}
                              {movement.quantity} units
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Reason</p>
                            <p className="font-semibold" data-testid={`text-reason-${movement.id}`}>
                              {movement.reason}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Date</p>
                            <p className="font-semibold" data-testid={`text-date-${movement.id}`}>
                              {movement.createdAt && format(new Date(movement.createdAt), "MMM dd, yyyy HH:mm")}
                            </p>
                          </div>
                        </div>
                        {movement.notes && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground">Notes:</p>
                            <p className="text-sm mt-1" data-testid={`text-notes-${movement.id}`}>
                              {movement.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <QRScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onProductScanned={(product) => {
          setSelectedProduct(product);
          setIsStockDialogOpen(true);
          setIsScannerOpen(false);
        }}
      />
      {selectedProduct && (
        <StockMovementDialog
          open={isStockDialogOpen}
          onOpenChange={(open) => {
            setIsStockDialogOpen(open);
            if (!open) setSelectedProduct(null);
          }}
          product={selectedProduct}
        />
      )}
    </div>
  );
}