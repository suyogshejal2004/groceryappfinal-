import "dotenv/config.js";
import fastifySession from "@fastify/session";
import ConnectMongoDBSession from "connect-mongodb-session";
import { Admin } from "../models/index.js";

export const PORT = process.env.PORT || 3000;
export const COOKIE_PASSWORD = process.env.COOKIE_PASSWORD;

const MongoDBStore = ConnectMongoDBSession(fastifySession);

export const sessionStore = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

sessionStore.on("error", (error) => {
  console.log("Session store error", error);
});

export const authenticate = async (email, password) => {
  // Yeh log batayega ki login ki koshish shuru hui
  console.log(`[LOGIN ATTEMPT] Email: ${email}`);

  if (email && password) {
    const user = await Admin.findOne({ email });
    
    if (!user) {
      // Yeh log batayega ki user nahi mila
      console.log("[LOGIN FAILED] User not found in database.");
      return null;
    }

    if (user.password === password) {
      // Yeh log batayega ki login safal hua
      console.log("[LOGIN SUCCESS] User authenticated! Preparing to redirect...");
      return Promise.resolve(user);
    } else {
      // Yeh log batayega ki password galat hai
      console.log("[LOGIN FAILED] Incorrect password.");
      return null;
    }
  } 

  return null;
};
