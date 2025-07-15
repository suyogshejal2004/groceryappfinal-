import "dotenv/config.js";
import mongoose from "mongoose";
import { Category, Product } from "./src/models/index.js"; // ✅ Fixed import
import { categories, products } from "./seedData.js"; // ✅ Added .js

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Clear old data
    await Product.deleteMany({});
    await Category.deleteMany({});

    // Insert categories
    const categoryDocs = await Category.insertMany(categories);

    // Map category names to IDs
    const categoryMap = categoryDocs.reduce((map, category) => {
      map[category.name] = category._id;
      return map;
    }, {});

    // Replace category names in products with IDs
    const productWithCategoryIds = products.map((product) => ({
      ...product,
      category: categoryMap[product.category],
    }));

    // Insert products
    await Product.insertMany(productWithCategoryIds);

    console.log("DATABASE SEEDED SUCCESSFULLY ✅");
  } catch (error) {
    console.error("Error Seeding database:", error);
  } finally {
    mongoose.connection.close();
  }
}

seedDatabase();
