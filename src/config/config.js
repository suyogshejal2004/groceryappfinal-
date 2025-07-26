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
  //creating admin frist time

  if (email && password) {
    if ( email === "suyogshejal2004@gmail.com" && password === "Suyog@2004") {
      return Promise.resolve({ email: email, password: password }); // you can handle invalid password here
    } else {
      return null; // you can handle invalid password here
    }
  }
// ok created testing 
  //UNcomment this when creadet admin panel manually in databse
  /*if (email && password) {
    const user = await Admin.findOne({ email });
    if (!user) {
      return null; // you can handle invalid user here
    }
    if (user.password === password) {
      return Promise.resolve({ email: email, password: password }); // you can handle invalid password here
    } else {
      return null; // you can handle invalid password here
    }
  } */

  return null;
};
