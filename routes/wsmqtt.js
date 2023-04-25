import Aedes from "aedes";
import { sendMail } from "../lib/mail.js";
import { getWeatherData } from "../lib/weather.js";
import { deviceModel, ActiveDeviceModel } from "../models/deviceModel.js";
import { alarmModel } from "../models/alarmModel.js";
import { liveDataModel } from "../models/liveDataModel.js";
import { lightDataModel } from "../models/lightDataModel.js";
import mail from "nodemailer";
const nodemailer = mail;
import dotenv from "dotenv";
import { userModel } from "../models/userModel.js";
import { comparePassword } from "../lib/crypto.js";
dotenv.config();
const TEN_MIN = 10 * 60 * 1000;
export const aedesWS = new Aedes({
  keepalive: 0,
  heartbeatInterval: 60000,
  /* subscribe: async (subscriptions, client) => {
    console.log(
      "MQTT client \x1b[32m" +
        (client ? client.id : client) +
        "\x1b[0m subscribed to topics: " +
        subscriptions.map((s) => s.topic).join("\n"),
      "from broker",
      aedesWS.id
    );
  },
  unsubscribe: async (subscriptions, client) => {
    console.log(
      "MQTT client \x1b[32m" +
        (client ? client.id : client) +
        "\x1b[0m unsubscribed to topics: " +
        subscriptions.join("\n"),
      "from broker",
      aedesWS.id
    );
  }, */
  client: async (client) => {
    console.log(
      "Client Connected: \x1b[33m" + (client ? client.id : client) + "\x1b[0m",
      "to broker",
      aedesWS.id
    );
    client._keepaliveInterval;
    console.log("Keepalive timeout: " + client._keepaliveInterval);
    //aedesWS.publish({ topic: 'setup/profile', payload: {name:"edge-01",location:"helldomen",shaft:2,version:2,profileName:"kongensmann"},username:"per",password:"test"});
  },
  clientDisconnect: async (client) => {
    console.log(
      "Client Disconnected: \x1b[31m" +
        (client ? client.id : client) +
        "\x1b[0m",
      "to broker",
      aedesWS.id
    );
  },
  keepaliveTimeout: async (client) => {
    console.log(
      "Client LOST CONNECTION: \x1b[31m" +
        (client ? client.id : client) +
        "\x1b[0m",
      "to broker",
      aedesWS.id
    );
  },
  authorizeSubscribe: (client, subscriptions, callback) => {
    console.log(
      "MQTT client \x1b[32m" +
        (client ? client.id : client) +
        "\x1b[0m subscribed to topics: ",
      aedesWS.id
    );
    if (
      subscriptions.topic == client.id ||
      subscriptions.topic === "test" ||
      subscriptions.topic.startsWith("devices/") ||
      subscriptions.topic.startsWith("locations/")
    ) {
      callback(null, subscriptions);
      // will negate sub and return granted qos 128
    } else {
      callback(null, null);
    }
  },
  authenticate: async (client, username, password, callback) => {
    console.log("password", password);
    if (username && password) {
      const person = await userModel.findOne({ userName: username });

      password = Buffer.from(password, "base64").toString();

      if (await comparePassword(password, person.password)) {
        if (person.role === "admin") {
          client.admin = true;
          client.allowed = true;
          console.log("is admin");
        } else {
          client.allowed = true;
          console.log("is normal");
        }
      }
    } else {
      console.log("not loged in");
      client.allowed = false;
      client.admin = false;
    }

    return callback(null, true);
  },
  authorizePublish: async (client, packet, callback) => {
    if (packet.topic.startsWith("$SYS/")) {
      return callback(new Error("$SYS/" + " topic is reserved"));
    }

    let publish = false;
    console.log(
      "Client \x1b[31m" +
        (client ? client.id : "BROKER_" + aedesWS.id) +
        "\x1b[0m is trying  to publish",
      packet.payload.toString(),
      "on",
      packet.topic,
      "to broker",
      aedesWS.id
    );
    if (packet.topic === "test") {
      publish = true;
    }
    if (client.admin) {
      /*   const settings = client;
        const passBuff = client._parser.settings.password;
        const username = client._parser.settings.username;
        const pass = passBuff.toString("utf8");
        console.log("client is: ", pass);
  
        if ((client.password = "test")) {
          return callback(null);
        } else {
          return new Error("Not authorized");
        } */
      publish = true;
    } else if (packet.topic === "devices") {
      const { deviceName, fw, build, location } = await JSON.parse(
        packet.payload
      );

      const deviceInstance = await new deviceModel({
        deviceName,
        fw,
        build,
        active: location.length() > 0,
        status: true,
      });
      const res = await deviceInstance.save();

      publish = true;
    } else if (packet.topic.endsWith("/alarm") && client.allowed) {
      const location = packet.topic.split("/")[1];
      const { type, name, status } = await JSON.parse(packet.payload);

      const alarminstances = await new alarmModel({
        deviceName: client.id,
        name,
        location,
        type,
        status,
      });
      const res = alarminstances.save();
      publish = true;
    } else if (packet.topic.endsWith("/live") && client.allowed) {
      const location = packet.topic.split("/")[1];
      const { device, lux, temp, humidity } = await JSON.parse(packet.payload);

      const item = liveDataModel.findOne({
        timestamp: { $lte: new Date(Date.now() - TEN_MIN) },
      });

      if (item) {
        const liveInstances = await new liveDataModel({
          deviceName: device,
          lux,
          temp,
          humidity,
          location,
        });
        const res = liveInstances.save();
      }

      publish = true;
    } else if (packet.topic.endsWith("/light") && client.allowed) {
      const location = packet.topic.split("/")[1];
      const { sunlight, lamplight, total } = await JSON.parse(packet.payload);

      const lightinstances = await new lightDataModel({
        deviceName: client.id,
        sunlight,
        lamplight,
        total,
        location,
      });
      const res = lightinstances.save();

      publish = true;
    }
    if (publish) {
      console.log(
        "Client \x1b[31m" +
          (client ? client.id : "BROKER_" + aedesWS.id) +
          "\x1b[0m has published",
        packet.payload.toString(),
        "on",
        packet.topic,
        "to broker",
        aedesWS.id
      );
      return callback(null);
    }
    console.log(
      "Client \x1b[31m" +
        (client ? client.id : "BROKER_" + aedesWS.id) +
        "\x1b[0m is trying  to publish",
      packet.payload.toString(),
      "on",
      packet.topic,
      "to broker",
      aedesWS.id
    );
  },
});
