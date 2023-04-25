import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { mongoose } from "mongoose";

import { aedesHandel } from "./routes/mqtt.js";
import { devices } from "./routes/devices.js";
import { requestUser, userLogin } from "./routes/login.js";
import { locations } from "./routes/locations.js";
import net from "net";
import path from "path";
import ws from "websocket-stream";
import http from "http";
import { aedesWS } from "./routes/wsmqtt.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
dotenv.config();
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const http_port = process.env.PORT || 3000;
mongoose.set("strictQuery", true);

mongoose
  .connect("mongodb://127.0.0.1/greenhouse")
  .then(async () => {
    console.log("connected to db");

    const createServer = net.createServer;

    const server = createServer(aedesWS.handle, { keepalive: 1 });
    const port_mqtt = 4000;
    const wsPort = 4001;
    const httpServer = http.createServer();

    ws.createServer({ server: httpServer }, aedesWS.handle);

    server.listen(port_mqtt, "0.0.0.0", function () {
      console.log("Aedes listening on port:", port_mqtt);

      var msg = { location: "oslo", min: "-2", max: "2" };
    });
    httpServer.listen(wsPort, "0.0.0.0", function () {
      console.log("Aedes MQTT-WS listening on port: " + wsPort);
      aedesWS.publish({
        topic: "aedes/hello",
        payload: "I'm broker " + aedesWS.id,
      });
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
app.get("/fw/:build/:fileName", async function (req, res) {
  console.log("sending file");
  const file = path.join(
    __dirname,
    "fw",
    req.params.build,
    req.params.fileName
  );
  //res.sendFile("fw/" + req.params.build + "/"+ req.params.fileName, { root: __dirname });
  res.sendFile(file);
});
console.log("http started on port: ", http_port);
app.listen(http_port);
