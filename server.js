import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { mongoose } from "mongoose";

import { devices } from "./routes/devices.js";
import { requestUser, userLogin } from "./routes/login.js";
import { locations } from "./routes/locations.js";
import net from "net";
import path from "path";
import ws from "websocket-stream";
import http from "http";
import { aedesWS } from "./routes/wsmqtt.js";
import { readVersion, updateFW } from "./lib/readFile.js";
import { hashPassword } from "./lib/crypto.js";
import { userModel } from "./models/userModel.js";
import { checkTokens } from "./lib/expoNotifaction.js";
import { createLightData, createLiveData } from "./lib/dummyData.js";
import { ValidTokenModel } from "./models/validTokenModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
dotenv.config();
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const http_port = process.env.PORT || 3000;
const port_mqtt = 4000;
const wsPort = 4001;

mongoose.set("strictQuery", true);

const urlLocal = process.env.DB_URL || "mongodb://127.0.0.1/greenleaf";
mongoose
  .connect(urlLocal, { useNewUrlParser: true })
  .then(async (db) => {
    console.log("connected to db");

    try {
    } catch (error) {}

    const oldUser = await userModel.findOne({ name: "edge-01" });
    if (!oldUser) {
      let pass = await hashPassword("edge");
      await createLiveData();
      await createLightData();
      const data = await userModel({
        name: "edge-01",
        userName: "edge-01",
        password: pass,
        role: "user",
      });
      await data.save();
      try {
        await data.save();
      } catch (error) {
        console.log(error);
      }
    } else {
      console.log("====================================");
      console.log("user allready added");
      console.log("====================================");
    }

    const oldAdmin = await userModel.findOne({ name: "test" });

    if (!oldAdmin) {
      let pass = await hashPassword("test");
      const data = await userModel({
        name: "test",
        userName: "test",
        password: pass,
        role: "admin",
      });
      await data.save();
      try {
        await data.save();
      } catch (error) {
        console.log(error);
      }
    } else {
      console.log("====================================");
      console.log("user allready added");
      console.log("====================================");
    }

    const createServer = net.createServer;

    const server = createServer(aedesWS.handle, { keepalive: 1 });

    const httpServer = http.createServer();

    ws.createServer({ server: httpServer }, aedesWS.handle);

    server.listen(port_mqtt, "0.0.0.0", function () {
      console.log("Aedes listening on port:", port_mqtt);

      var msg = { location: "oslo", min: "-2", max: "2" };
    });
    httpServer.listen(wsPort, "0.0.0.0", async function () {
      console.log("Aedes MQTT-WS listening on port: ", wsPort);
      // Periodically check the status of push receipts every 30 minutes
      await ValidTokenModel.deleteMany({ done: true });
      await checkTokens();
      setInterval(checkTokens, 10 * 60 * 1000);
      await updateFW();
    });
    server.on("error", function (err) {
      console.log("Server error", err);
      process.exit(1);
    });

    //saveProduct();
    //app.use(addRole(mongoose));
  })
  .catch((error) => console.log("error:", error));

app.use(requestUser());
app.use("/api/devices", devices());
app.use("/api/locations", locations());
app.use("/api/login", userLogin());
app.get("/fw", async function (req, res) {
  console.log("sending file");

  res.sendFile("fw/fw.json", {
    root: __dirname,
  });
});
app.get("/fw/:build/:fileName", async function (req, res) {
  console.log("sending file");
  const file = path.join(
    __dirname,
    "fw",
    req.params.build,
    req.params.fileName
  );

  res.sendFile(file);
});
console.log("http started on port: ", http_port);
app.listen(http_port);
