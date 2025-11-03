import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey(),
  productName: text("product_name").notNull(),
  sku: text("sku").notNull().unique(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  description: text("description"),
  
  // Variant details
  color: text("color").notNull(),
  size: text("size").notNull(),
  fabric: text("fabric"),
  pattern: text("pattern"),
  gender: text("gender").notNull(),
  
  // Pricing & Stock
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  warehouse: text("warehouse"),
  
  // Media
  productImage: text("product_image"),
  galleryImages: text("gallery_images").array(),
  
  // Metadata
  isFeatured: boolean("is_featured").default(false),
  launchDate: timestamp("launch_date"),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  tags: text("tags").array(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products, {
  productName: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().min(1, "Brand is required"),
  color: z.string().min(1, "Color is required"),
  size: z.string().min(1, "Size is required"),
  gender: z.string().min(1, "Gender is required"),
  price: z.string().min(1, "Price is required"),
  stockQuantity: z.number().int().min(0, "Stock quantity must be 0 or greater"),
  productImage: z.string().optional(),
  galleryImages: z.array(z.string()).optional(),
  rating: z.string().optional(),
}).omit({ id: true, createdAt: true });

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").notNull(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  sku: text("sku").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderSchema = createInsertSchema(orders, {
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
  totalAmount: z.string().min(1, "Total amount is required"),
}).omit({ id: true, createdAt: true, orderNumber: true });

export const insertOrderItemSchema = createInsertSchema(orderItems, {
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
}).omit({ id: true, orderId: true });

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Combined order with items type
export type OrderWithItems = Order & {
  items: OrderItem[];
};

// Stock movements table
export const stockMovements = pgTable("stock_movements", {
  id: varchar("id").primaryKey(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  sku: text("sku").notNull(),
  type: text("type").notNull(), // 'in' | 'out' | 'adjustment'
  quantity: integer("quantity").notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovements, {
  productId: z.string().min(1, "Product ID is required"),
  productName: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  type: z.enum(["in", "out", "adjustment"]),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  reason: z.string().min(1, "Reason is required"),
}).omit({ id: true, createdAt: true });

export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;

// Returns table
export const returns = pgTable("returns", {
  id: varchar("id").primaryKey(),
  returnNumber: text("return_number").notNull().unique(),
  orderId: varchar("order_id").notNull(),
  orderNumber: text("order_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'completed'
  reason: text("reason").notNull(),
  notes: text("notes"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  creditAmount: decimal("credit_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Return items table
export const returnItems = pgTable("return_items", {
  id: varchar("id").primaryKey(),
  returnId: varchar("return_id").notNull(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  sku: text("sku").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  exchangeProductId: varchar("exchange_product_id"),
  exchangeProductName: text("exchange_product_name"),
});

export const insertReturnSchema = createInsertSchema(returns, {
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  status: z.enum(["pending", "approved", "rejected", "completed"]),
  reason: z.string().min(1, "Return reason is required"),
}).omit({ id: true, createdAt: true, returnNumber: true });

export const insertReturnItemSchema = createInsertSchema(returnItems).omit({ 
  id: true, 
  returnId: true 
});

export type InsertReturn = z.infer<typeof insertReturnSchema>;
export type Return = typeof returns.$inferSelect;
export type InsertReturnItem = z.infer<typeof insertReturnItemSchema>;
export type ReturnItem = typeof returnItems.$inferSelect;

export type ReturnWithItems = Return & {
  items: ReturnItem[];
};

// Discount codes table
export const discountCodes = pgTable("discount_codes", {
  id: varchar("id").primaryKey(),
  code: text("code").notNull().unique(),
  customerEmail: text("customer_email").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDiscountCodeSchema = createInsertSchema(discountCodes, {
  code: z.string().min(1, "Code is required"),
  customerEmail: z.string().email("Valid email is required"),
  amount: z.string().min(1, "Amount is required"),
}).omit({ id: true, createdAt: true });

export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodes.$inferSelect;
