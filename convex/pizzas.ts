import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("pizzas").collect();
  },
});

export const getById = query({
  args: { id: v.id("pizzas") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});
