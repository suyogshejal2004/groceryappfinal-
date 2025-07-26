import AdminJS from "adminjs";
import AdminJSFastify from "@adminjs/fastify";
import * as AdminJSMongoose from "@adminjs/mongoose";
import * as Models from "../models/index.js";
import { authenticate, COOKIE_PASSWORD, sessionStore } from "./config.js";
import { dark, light, noSidebar } from "@adminjs/themes";

// ✅ Register the mongoose adapter
AdminJS.registerAdapter(AdminJSMongoose);

// ✅ Create the AdminJS instance
export const admin = new AdminJS({
  resources: [
    {
      resource: Models.Customer,
      options: {
        listProperties: ["phone", "role", "isActivated"],
        filterProperties: ["phone", "role"],
      },
    },
    {
      resource: Models.DeliveryPartner,
      options: {
        listProperties: ["email", "role", "isActivated"],
        filterProperties: ["email", "role"],
      },
    },
    {
      resource: Models.Admin,
      options: {
        listProperties: ["email", "role", "isActivated"],
        filterProperties: ["email", "role"],
      },
    },
    { resource: Models.Branch },
    { resource: Models.Product },
    { resource: Models.Category },
    { resource: Models.Order },
    { resource: Models.Counter },
  ],
  branding: {
    companyName: "Grocery Delivery App",
    withMadeWithLove: false,
    // you can set a theme if you want
    // theme: dark,
  },
});

// ✅ Build AdminJS router with fixed cookie settings
export const buildAdminRouter = async (app) => {
  await AdminJSFastify.buildAuthenticatedRouter(
    admin,
    {
      authenticate,                     // 🔑 your authentication function
      cookiePassword: COOKIE_PASSWORD,  // 🔒 strong secret
      cookieName: 'adminjs'             // 🍪 cookie name
    },
    app,
    {
      store: sessionStore,              // 🗄️ session store (e.g. connect-mongodb-session)
      saveUninitialized: true,
      secret: COOKIE_PASSWORD,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // ✅ secure in prod
        sameSite: 'none',                               // ✅ allow cross-site cookie
      },
    }
  );
};
