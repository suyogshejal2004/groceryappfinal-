import "dotenv/config";
import { connectDB } from "./src/config/connect.js";
import fastify from "fastify";
import { PORT } from "./src/config/config.js";
import fastifySocketIO from "fastify-socket.io";
import { registerRoutes } from "./src/routes/index.js";
import { buildAdminRouter, admin } from "./src/config/setup.js";
import AdminJSFastify from "@adminjs/fastify";

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    
    // This is the only change we are making
    const app = fastify({
      trustProxy: true, // This line tells the server to trust Render
    });

    app.register(fastifySocketIO, {
      cors: {
        origin: "*",
      },
      pingInterval: 10000,
      pingTimeout: 5000,
      transports: ["websocket"],
    });

    await registerRoutes(app);
    await buildAdminRouter(app);

    app.listen({ port: PORT, host: "0.0.0.0" }, (err, addr) => {
      if (err) {
        console.error("Server error:", err);
      } else {
        console.log(
          `Grocery app running on http://localhost:${PORT}${admin.options.rootPath}`
        );
      }
    });

    app.ready().then(() => {
      app.io.on("connection", (socket) => {
        console.log("A User Connected ✅");

        socket.on("joinRoom", (orderId) => {
          socket.join(orderId);
          console.log(`🔴 User Joined room ${orderId}`);
        });

        socket.on("disconnect", () => {
          console.log("User Disconnected ❌");
        });
      });
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

start();
