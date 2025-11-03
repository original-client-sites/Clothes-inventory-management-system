import { Package, ShoppingCart, TrendingUp } from "lucide-react";
import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [isInventory] = useRoute("/");
  const [isOrders] = useRoute("/orders");
  const [isStock] = useRoute("/stock-history");

  return (
    <nav className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Inventory Manager</span>
            </div>
            <div className="flex gap-1">
              <Link href="/">
                <a
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                    isInventory
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Package className="h-4 w-4" />
                  <span>Inventory</span>
                </a>
              </Link>
              <Link href="/orders">
                <a
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                    isOrders
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Orders</span>
                </a>
              </Link>
              <Link href="/stock-history">
                <a
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                    isStock
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Stock History</span>
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}