import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { mongoose } from "mongoose";
import { aedesHandel, aedes } from "./routes/mqtt.js";
import net from "net";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
dotenv.config();
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const http_port = process.env.PORT || 3000;
mongoose.set("strictQuery", true);
app.listen(http_port);

mongoose
  .connect("mongodb://127.0.0.1/greenhouse")
  .then(async () => {
    console.log("connected to db");
    const createServer = net.createServer;

    const server = createServer(aedesHandel(), { keepalive: 1 });
    const port_mqtt = 4000;
    server.listen(port_mqtt, "0.0.0.0", function () {
      console.log("Aedes listening on port:", port_mqtt);
      var msg = { location: "oslo", min: "-2", max: "2" };
    });

    server.on("error", function (err) {
      console.log("Server error", err);
      process.exit(1);
    });

    //saveProduct();
    //app.use(addRole(mongoose));
  })
  .catch((error) => console.log("error:", error));

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
