// src/routes/index.js

import { authRoutes } from "./auth.js";
import orderRoutes from "./order.js";
import { categoryRoutes, productRoutes } from "./product.js";

const prefix = "/api"; // Your API prefix

export const registerRoutes = async (fastify) => {
  // --- ADD THIS NEW ROUTE HANDLER FOR THE ROOT PATH ---
  fastify.get('/', async (request, reply) => {
    // You can customize this message as you like
    // It's good practice to provide a simple status or guidance.
    return reply.code(200).send({
      message: 'Welcome to the Grocery App API!',
      status: 'online',
      version: '1.0.0', // Optional: add your API version
      docs: '/api-docs', // Optional: if you have API documentation
      adminPanel: '/admin' // Guide users to your AdminJS panel
    });
  });
  // --- END OF NEW ROUTE HANDLER ---

  // Register your existing API routes with the /api prefix
  fastify.register(authRoutes, { prefix: prefix });
  fastify.register(productRoutes, { prefix: prefix });
  fastify.register(categoryRoutes, { prefix: prefix });
  fastify.register(orderRoutes, { prefix: prefix });

  // Optional: Add a route for the /api path itself if needed
  // fastify.get('/api', async (request, reply) => {
  //   return reply.code(200).send({ message: 'Grocery App API base endpoint.' });
  // });
};
