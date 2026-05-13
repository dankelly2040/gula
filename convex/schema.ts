import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    sortOrder: v.number(),
    image: v.optional(v.id("_storage")),
  }),

  pizzas: defineTable({
    name: v.string(),
    description: v.string(),
    image: v.optional(v.id("_storage")),
    categoryId: v.id("categories"),
    basePrice: v.number(),
    prepTimeMinutes: v.number(),
    rating: v.optional(v.number()),
    calories: v.optional(v.number()),
    isAvailable: v.boolean(),
  }).index("by_category", ["categoryId"]),

  sizes: defineTable({
    name: v.string(),
    priceMultiplier: v.number(),
  }),

  ingredients: defineTable({
    name: v.string(),
    price: v.number(),
    image: v.optional(v.id("_storage")),
    isAvailable: v.boolean(),
  }),

  orders: defineTable({
    userId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cooking"),
      v.literal("on_the_way"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    totalPrice: v.number(),
    deliveryAddress: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_status", ["status"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    pizzaId: v.id("pizzas"),
    sizeId: v.id("sizes"),
    quantity: v.number(),
    unitPrice: v.number(),
    extras: v.array(v.id("ingredients")),
  }).index("by_order", ["orderId"]),

  addresses: defineTable({
    userId: v.string(),
    label: v.string(),
    address: v.string(),
    isDefault: v.boolean(),
  }).index("by_user", ["userId"]),
});
