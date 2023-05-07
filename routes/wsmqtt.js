import Aedes from "aedes";
import { sendDeviceAlarm, sendLocationAlarm } from "../lib/mail.js";
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
import { readVersion } from "../lib/readFile.js";
dotenv.config();
const TEN_MIN = 10 * 60 * 1000;
export const aedesWS = new Aedes({
  authenticate: async (client, username, password, callback) => {
    console.log("password", password);
    if (username && password) {
      const user = await userModel.findOne({ userName: username });

      password = Buffer.from(password, "base64").toString();
      console.log("user is ", password);
      if (await comparePassword(password, user.password)) {
        if (user.role === "admin") {
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
  authorizeSubscribe: (client, subscriptions, callback) => {
    console.log(
      "MQTT client \x1b[32m" +
        (client ? client.id : client) +
        "\x1b[0m subscribed to topics: ",
      subscriptions.topic
    );
    if (client.admin) {
      console.log("got to admin");
      callback(null, subscriptions);
    } else if (
      (subscriptions.topic.startsWith("devices/") &&
        subscriptions.topic.split("/")[1] === client.id) ||
      subscriptions.topic === "update" ||
      (subscriptions.topic.startsWith("devices/") &&
        subscriptions.topic.endsWith("/setup") &&
        client.allowed) ||
      (subscriptions.topic.startsWith("locations/") &&
        subscriptions.topic.endsWith("/live") &&
        client.allowed) ||
      (subscriptions.topic.startsWith("locations/") &&
        subscriptions.topic.endsWith("/light") &&
        client.allowed) ||
      (subscriptions.topic.startsWith("locations/") &&
        subscriptions.topic.endsWith("/alarm") &&
        client.allowed)
    ) {
      callback(null, subscriptions);
      // will negate sub and return granted qos 128
    } else {
      callback(null, null);
    }
  },
  authorizePublish: async (client, packet, callback) => {
    if (packet.topic.startsWith("$SYS/")) {
      console.log("publish to sys not allowed");
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
    if (packet.topic === "update") {
      publish = true;
    }
    if (false) {
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
    } else if (
      (packet.topic.startsWith("/devices") &&
        packet.topic.split("/")[1] == client.id) ||
      (client.admin &&
        packet.topic.startsWith("/devices") &&
        !packet.topic.endsWith("/setup"))
    ) {
      console.log("seding find me ");

      publish = true;
    } else if (packet.topic.endsWith("/setup") && client.admin) {
      let { _id, deviceName, fw, build, location, auto, mqttPass } =
        await JSON.parse(packet.payload);
      let isLogging = false;
      console.log(location);

      if (location) {
        isLogging = location.toString().length > 0;
      }
      auto = auto ? true : false;
      console.log(_id);
      const data = {
        deviceName,
        location,
        fw,
        build,
        auto,
        mqttPass,
        logging: isLogging,
      };

      const result = deviceModel
        .updateOne({ _id }, { $set: data })
        .then((doc) => {
          console.log(doc);
        })
        .catch((err) => {
          console.log(err);
        });

      if (result.nModifed == 0) {
        console.log("item was not found in db");
      } else {
        console.log("item was Updated on server");
      }

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
      if (status) {
        sendLocationAlarm(location, type, name);
      }
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
  },
});

aedesWS.on("client", async function (client) {
  console.log(
    "Client Connected: \x1b[33m" + (client ? client.id : client) + "\x1b[0m",
    "to broker",
    aedesWS.id
  );
  const device = await deviceModel.updateOne(
    { deviceName: client.id },
    { $set: { online: true } }
  );

  if (client.allowed && !client.admin) client._keepaliveInterval = 100000;
  console.log("Keepalive timeout: " + client._keepaliveInterval);
  //aedes.publish({ topic: 'setup/profile', payload: {name:"edge-01",location:"helldomen",shaft:2,version:2,profileName:"kongensmann"},username:"per",password:"test"});
});

// fired when a client disconnects
// send alarm when edge device disconnects and remove from list
aedesWS.on("clientDisconnect", async function (client) {
  console.log(
    "Client Disconnected: \x1b[31m" + (client ? client.id : client) + "\x1b[0m",
    "to broker",
    aedesWS.id
  );
  const device = await deviceModel.updateOne(
    { deviceName: client.id },
    { $set: { online: false } }
  );
});
aedesWS.on("keepaliveTimeout", async function (client) {
  console.log(
    "Client LOST CONNECTION: \x1b[31m" +
      (client ? client.id : client) +
      "\x1b[0m",
    "to broker",
    aedesWS.id
  );
  const device = await deviceModel.updateOne(
    { deviceName: client.id },
    { $set: { online: false } }
  );
  sendDeviceAlarm(
    client.id,
    "device lost mqtt connection or wifi",
    "keepaliveTimeout"
  );
  client.close();
});

aedesWS.keepalive = 90000;
aedesWS.heartbeatInterval = 60000;
