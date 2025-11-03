import {
  products,
  orders,
  orderItems,
  stockMovements,
  returns,
  returnItems,
  discountCodes,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderWithItems,
  type StockMovement,
  type InsertStockMovement,
  type Return,
  type InsertReturn,
  type ReturnItem,
  type InsertReturnItem,
  type ReturnWithItems,
  type DiscountCode,
  type InsertDiscountCode,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { sql, eq } from "drizzle-orm";
import { db } from "./db";


export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySKU(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: InsertProduct): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Orders
  getOrders(): Promise<OrderWithItems[]>;
  getOrder(id: string): Promise<OrderWithItems | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithItems>;
  updateOrder(id: string, order: InsertOrder): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;

  // Stock Movements
  getStockMovements(productId?: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  getLowStockProducts(threshold?: number): Promise<Product[]>;

  // Returns
  getReturns(): Promise<ReturnWithItems[]>;
  getReturn(id: string): Promise<ReturnWithItems | null>;
  createReturn(data: InsertReturn, items: InsertReturnItem[]): Promise<ReturnWithItems>;
  updateReturn(id: string, data: Partial<InsertReturn>): Promise<Return | null>;

  // Discount Codes
  getDiscountCodes(customerEmail?: string): Promise<DiscountCode[]>;
  getDiscountCode(code: string): Promise<DiscountCode | null>;
  createDiscountCode(data: InsertDiscountCode): Promise<DiscountCode>;
  useDiscountCode(code: string): Promise<DiscountCode | null>;
}

export class MemStorage implements IStorage {
  private products: Map<string, Product>;
  private orders: Map<string, Order>;
  private orderItems: Map<string, OrderItem>;
  private stockMovements: Map<string, StockMovement>;

  constructor() {
    this.products = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.stockMovements = new Map();
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductBySKU(sku: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(
      (product) => product.sku === sku
    );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      createdAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(
    id: string,
    insertProduct: InsertProduct
  ): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;

    const updated: Product = {
      ...insertProduct,
      id,
      createdAt: existing.createdAt,
    };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  // Orders
  async getOrders(): Promise<OrderWithItems[]> {
    const orders = Array.from(this.orders.values());
    return Promise.all(
      orders.map(async (order) => {
        const items = await this.getOrderItems(order.id);
        return { ...order, items };
      })
    );
  }

  async getOrder(id: string): Promise<OrderWithItems | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const items = await this.getOrderItems(id);
    return { ...order, items };
  }

  async createOrder(
    insertOrder: InsertOrder,
    insertItems: InsertOrderItem[]
  ): Promise<OrderWithItems> {
    const id = randomUUID();
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

    const order: Order = {
      ...insertOrder,
      id,
      orderNumber,
      createdAt: new Date(),
    };
    this.orders.set(id, order);

    // Create order items
    const items: OrderItem[] = insertItems.map((item) => {
      const itemId = randomUUID();
      const orderItem: OrderItem = {
        ...item,
        id: itemId,
        orderId: id,
      };
      this.orderItems.set(itemId, orderItem);
      return orderItem;
    });

    return { ...order, items };
  }

  async updateOrder(
    id: string,
    insertOrder: InsertOrder
  ): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;

    const updated: Order = {
      ...insertOrder,
      id,
      orderNumber: existing.orderNumber,
      createdAt: existing.createdAt,
    };
    this.orders.set(id, updated);
    return updated;
  }

  async deleteOrder(id: string): Promise<boolean> {
    // Delete order items first
    const items = await this.getOrderItems(id);
    items.forEach((item) => this.orderItems.delete(item.id));

    // Delete order
    return this.orders.delete(id);
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(
      (item) => item.orderId === orderId
    );
  }

  // Stock Movements
  async getStockMovements(productId?: string): Promise<StockMovement[]> {
    const movements = Array.from(this.stockMovements.values());
    if (productId) {
      return movements.filter((m) => m.productId === productId);
    }
    return movements.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async createStockMovement(insertMovement: InsertStockMovement): Promise<StockMovement> {
    const id = randomUUID();
    const movement: StockMovement = {
      ...insertMovement,
      id,
      createdAt: new Date(),
    };
    this.stockMovements.set(id, movement);

    // Update product stock quantity
    const product = await this.getProduct(insertMovement.productId);
    if (product) {
      let newQuantity = product.stockQuantity;
      if (insertMovement.type === "in") {
        newQuantity += insertMovement.quantity;
      } else if (insertMovement.type === "out") {
        newQuantity -= insertMovement.quantity;
      } else if (insertMovement.type === "adjustment") {
        newQuantity = insertMovement.quantity;
      }

      await this.updateProduct(insertMovement.productId, {
        ...product,
        stockQuantity: Math.max(0, newQuantity),
      });
    }

    return movement;
  }

  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.stockQuantity < threshold && product.stockQuantity > 0
    );
  }

  // Returns
  async getReturns(): Promise<ReturnWithItems[]> {
    const allReturns = await db.select().from(returns).execute();
    const returnsWithItems = await Promise.all(
      allReturns.map(async (ret) => {
        const items = await db.select()
          .from(returnItems)
          .where(eq(returnItems.returnId, ret.id))
          .execute();
        return { ...ret, items };
      })
    );
    return returnsWithItems;
  }

  async getReturn(id: string): Promise<ReturnWithItems | null> {
    const [ret] = await db.select().from(returns).where(eq(returns.id, id)).execute();
    if (!ret) return null;

    const items = await db.select()
      .from(returnItems)
      .where(eq(returnItems.returnId, id))
      .execute();

    return { ...ret, items };
  }

  async createReturn(data: InsertReturn, items: InsertReturnItem[]): Promise<ReturnWithItems> {
    const returnId = randomUUID();
    const returnNumber = `RET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const [newReturn] = await db.insert(returns)
      .values({ id: returnId, returnNumber, ...data })
      .returning()
      .execute();

    const returnItemsData = items.map(item => ({
      id: randomUUID(),
      returnId,
      ...item,
    }));

    const createdItems = await db.insert(returnItems)
      .values(returnItemsData)
      .returning()
      .execute();

    // Update stock quantities for returned items
    for (const item of items) {
      await db.update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} + ${item.quantity}`
        })
        .where(eq(products.id, item.productId))
        .execute();

      // Create stock movement
      await this.createStockMovement({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        type: 'in',
        quantity: item.quantity,
        reason: 'return',
        notes: `Return ${returnNumber}`,
      });
    }

    return { ...newReturn, items: createdItems };
  }

  async updateReturn(id: string, data: Partial<InsertReturn>): Promise<Return | null> {
    const [updated] = await db.update(returns)
      .set(data)
      .where(eq(returns.id, id))
      .returning()
      .execute();
    return updated || null;
  }

  // Discount codes
  async getDiscountCodes(customerEmail?: string): Promise<DiscountCode[]> {
    if (customerEmail) {
      return db.select()
        .from(discountCodes)
        .where(eq(discountCodes.customerEmail, customerEmail))
        .execute();
    }
    return db.select().from(discountCodes).execute();
  }

  async getDiscountCode(code: string): Promise<DiscountCode | null> {
    const [discountCode] = await db.select()
      .from(discountCodes)
      .where(eq(discountCodes.code, code))
      .execute();
    return discountCode || null;
  }

  async createDiscountCode(data: InsertDiscountCode): Promise<DiscountCode> {
    const [discountCode] = await db.insert(discountCodes)
      .values({ id: randomUUID(), ...data })
      .returning()
      .execute();
    return discountCode;
  }

  async useDiscountCode(code: string): Promise<DiscountCode | null> {
    const [updated] = await db.update(discountCodes)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(discountCodes.code, code))
      .returning()
      .execute();
    return updated || null;
  }
}

export const storage = new MemStorage();