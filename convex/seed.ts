import { mutation } from "./_generated/server";

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing data
    for (const table of [
      "orderItems",
      "orders",
      "addresses",
      "pizzas",
      "ingredients",
      "sizes",
      "categories",
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    }

    // Categories
    const [classicId, specialtyId, vegId, meatId] = await Promise.all([
      ctx.db.insert("categories", { name: "Classic", sortOrder: 0 }),
      ctx.db.insert("categories", { name: "Specialty", sortOrder: 1 }),
      ctx.db.insert("categories", { name: "Vegetarian", sortOrder: 2 }),
      ctx.db.insert("categories", { name: "Meat Lovers", sortOrder: 3 }),
    ]);

    // Sizes
    const [smallId, mediumId, largeId] = await Promise.all([
      ctx.db.insert("sizes", { name: "Small", priceMultiplier: 0.75 }),
      ctx.db.insert("sizes", { name: "Medium", priceMultiplier: 1.0 }),
      ctx.db.insert("sizes", { name: "Large", priceMultiplier: 1.3 }),
    ]);

    // Ingredients
    await Promise.all([
      ctx.db.insert("ingredients", { name: "Extra Cheese", price: 1.5, isAvailable: true }),
      ctx.db.insert("ingredients", { name: "Pepperoni", price: 2.0, isAvailable: true }),
      ctx.db.insert("ingredients", { name: "Mushrooms", price: 1.0, isAvailable: true }),
      ctx.db.insert("ingredients", { name: "Bell Peppers", price: 1.0, isAvailable: true }),
      ctx.db.insert("ingredients", { name: "Onions", price: 0.75, isAvailable: true }),
      ctx.db.insert("ingredients", { name: "Olives", price: 1.0, isAvailable: true }),
      ctx.db.insert("ingredients", { name: "Jalapeños", price: 1.0, isAvailable: true }),
      ctx.db.insert("ingredients", { name: "Bacon", price: 2.5, isAvailable: true }),
      ctx.db.insert("ingredients", { name: "Sausage", price: 2.0, isAvailable: true }),
      ctx.db.insert("ingredients", { name: "Spinach", price: 1.0, isAvailable: true }),
    ]);

    // Pizzas
    await Promise.all([
      ctx.db.insert("pizzas", {
        name: "Margherita",
        description: "Classic tomato sauce, fresh mozzarella, and basil.",
        categoryId: classicId,
        basePrice: 12.99,
        prepTimeMinutes: 15,
        rating: 4.8,
        calories: 820,
        isAvailable: true,
      }),
      ctx.db.insert("pizzas", {
        name: "Pepperoni",
        description: "Loaded with premium pepperoni on a rich tomato base.",
        categoryId: classicId,
        basePrice: 14.99,
        prepTimeMinutes: 15,
        rating: 4.9,
        calories: 980,
        isAvailable: true,
      }),
      ctx.db.insert("pizzas", {
        name: "BBQ Chicken",
        description: "Smoky BBQ sauce, grilled chicken, red onions, and cilantro.",
        categoryId: specialtyId,
        basePrice: 16.99,
        prepTimeMinutes: 18,
        rating: 4.7,
        calories: 1050,
        isAvailable: true,
      }),
      ctx.db.insert("pizzas", {
        name: "Truffle Mushroom",
        description: "Truffle oil, wild mushrooms, fontina, and fresh thyme.",
        categoryId: specialtyId,
        basePrice: 18.99,
        prepTimeMinutes: 20,
        rating: 4.6,
        calories: 890,
        isAvailable: true,
      }),
      ctx.db.insert("pizzas", {
        name: "Garden Veggie",
        description: "Bell peppers, onions, olives, spinach, and tomatoes.",
        categoryId: vegId,
        basePrice: 13.99,
        prepTimeMinutes: 15,
        rating: 4.5,
        calories: 760,
        isAvailable: true,
      }),
      ctx.db.insert("pizzas", {
        name: "Spicy Arrabbiata",
        description: "Fiery arrabbiata sauce, jalapeños, chili flakes, and mozzarella.",
        categoryId: vegId,
        basePrice: 14.49,
        prepTimeMinutes: 15,
        rating: 4.4,
        calories: 800,
        isAvailable: true,
      }),
      ctx.db.insert("pizzas", {
        name: "Meat Feast",
        description: "Pepperoni, sausage, bacon, ground beef, and mozzarella.",
        categoryId: meatId,
        basePrice: 19.99,
        prepTimeMinutes: 20,
        rating: 4.8,
        calories: 1200,
        isAvailable: true,
      }),
      ctx.db.insert("pizzas", {
        name: "Smoky Bacon Ranch",
        description: "Ranch base, bacon, chicken, red onion, and cheddar.",
        categoryId: meatId,
        basePrice: 17.99,
        prepTimeMinutes: 18,
        rating: 4.6,
        calories: 1100,
        isAvailable: true,
      }),
    ]);

    return { ok: true, sizes: [smallId, mediumId, largeId] };
  },
});
