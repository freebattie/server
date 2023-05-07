import Aedes from "aedes";
import { sendDeviceAlarm, sendLocationAlarm } from "../lib/mail.js";

import { deviceModel, ActiveDeviceModel } from "../models/deviceModel.js";
import { alarmModel } from "../models/alarmModel.js";
import { liveDataModel } from "../models/liveDataModel.js";
import { lightDataModel } from "../models/lightDataModel.js";
import mail from "nodemailer";
const nodemailer = mail;
const debug = true;
import dotenv from "dotenv";
import { userModel } from "../models/userModel.js";
import { comparePassword } from "../lib/crypto.js";
import { readVersion } from "../lib/readFile.js";
let send = true;
import {
  addTokenstoDBForChecking,
  sendNotification,
} from "../lib/expoNotifaction.js";
import { ValidTokenModel } from "../models/validTokenModel.js";
import { locationModel } from "../models/locationModel.js";

dotenv.config();

const TEN_MIN = 10;
export const aedesWS = new Aedes({
  authenticate: async (client, username, password, callback) => {
    password = password?.toString("utf8");

    if (username && password) {
      const user = await userModel.findOne({
        userName: username.toLowerCase(),
      });

      //password = Buffer.from(password, "base64").toString();

      if (!user) {
      } else if (await comparePassword(password, user.password)) {
        if (user.role === "admin") {
          client.admin = true;
          client.allowed = true;
          console.log("is admin");
        } else {
          client.allowed = true;
          console.log("is normal");
          const device = await deviceModel.updateOne(
            { deviceName: client.id },
            { $set: { online: true } }
          );
        }
      } else {
        console.log("not loged in");
        client.allowed = false;
        client.admin = false;
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

    console.log("====================================");
    if (client.admin) {
      console.log("is admin");
      callback(null, subscriptions);
    } else if (
      (subscriptions.topic.startsWith("devices/") &&
        subscriptions.topic.split("/")[1] === client.id) ||
      subscriptions.topic === "update" ||
      (subscriptions.topic.startsWith("locations/") &&
        client.allowed &&
        subscriptions.topic.endsWith("/update")) ||
      (subscriptions.topic.startsWith("devices/") &&
        subscriptions.topic.endsWith("/profile") &&
        client.admin) ||
      (subscriptions.topic.startsWith("find") && client.allowed) ||
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
      console.log("user allowed to sub  to topic", subscriptions.topic);
      callback(null, subscriptions);
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
    if (debug) {
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
    }
    if (client.allowed) {
      const device = await deviceModel.updateOne(
        { deviceName: client.id },
        { $set: { online: true } }
      );
    }
    if (
      packet.topic.startsWith("locations") &&
      client.admin &&
      packet.topic.endsWith("/update")
    ) {
      console.log("why npt here");
      publish = true;
    }
    if (packet.topic === "update") {
      publish = true;
    }
    if (packet.topic === "findMe") {
      publish = true;
    } else if (packet.topic === "devices") {
      try {
        const { deviceName } = await JSON.parse(packet.payload);
        let device = await deviceModel.findOneAndUpdate(
          { deviceName },
          { online: true },
          { new: true }
        );

        if (!device) {
          const newDevice = new deviceModel({ deviceName, online: true });
          newDevice.save();
        }
      } catch (error) {
        console.log("====================================");
        console.log("error", error);
        console.log("====================================");
      }

      publish = true;
    } else if (packet.topic.endsWith("/profile") && client.admin) {
      let { deviceName, fw, build, location, auto, mqttPass } =
        await JSON.parse(packet.payload);

      let isLogging = false;

      if (location && auto) {
        isLogging = location.toString().length > 0;
        auto = auto;
      }
      auto = false;

      const data = {
        deviceName,
        location,
        fw,
        build,
        auto,
        mqttPass,
        logging: isLogging,
      };

      const result = await deviceModel
        .findOneAndUpdate({ deviceName }, data, { new: true })
        .catch((err) => {
          console.log(err);
        });

      if (!result) {
        console.log("item was not found in db");
      } else {
        console.log("item was Updated on server");
      }

      const payloadString = packet.payload.toString();

      // Parse the payload as JSON
      let payload = JSON.parse(payloadString);

      // Add the city field to the payload object
      const loc = await locationModel.findOne({
        location: location.toLowerCase(),
      });
      console.log("====================================");
      console.log(loc);
      console.log("====================================");
      payload.city = loc.city;

      // Convert the payload object back to a buffer
      const newPayloadBuffer = Buffer.from(JSON.stringify(payload));

      // Set the new payload buffer as the payload of the packet
      packet.payload = newPayloadBuffer;
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
      const res = await alarminstances.save();
      publish = true;
      if (status) {
        const users = await userModel.find({
          tokens: { $exists: true, $ne: [] },
        });
        if (type.toLowerCase() === "alarm") {
          if (users) {
            for (const user of users) {
              const data = {
                title: `Type:${type}`,
                body: `There is an ${name} ${type} at location ${location} whit status ${
                  status ? "ON" : "OFF"
                }`,
                sound: "default",
                data: { screen: "MainDashboard", location: location },
              };
              const responses = await sendNotification(user.tokens, data);
              console.log(responses);
              sendLocationAlarm(location, type, name);
              await addTokenstoDBForChecking(responses, user);
            }
          }
        }
      }
    } else if (packet.topic.endsWith("/live") && client.allowed) {
      const location = packet.topic.split("/")[1];
      const { device, lux, temp, humidity } = await JSON.parse(packet.payload);

      const item = await liveDataModel
        .findOne({ location })
        .sort({ createdAt: -1 })
        .limit(1);

      if (item) {
        const date = new Date();
        const oldDate = new Date(item.createdAt);
        date.setMinutes(date.getMinutes() - 10);
        if (oldDate < date) {
          console.log("saving data 10 min later:D");
          console.log("====================================");
          const liveInstances = await new liveDataModel({
            deviceName: device,
            lux,
            temp,
            humidity,
            location,
          });
          const res = await liveInstances.save();
        }
      } else {
        const liveInstances = await new liveDataModel({
          deviceName: device,
          lux,
          temp,
          humidity,
          location,
        });
        const res = await liveInstances.save();
      }

      publish = true;
    } else if (packet.topic.endsWith("/light") && client.allowed) {
      const location = packet.topic.split("/")[1];
      const { sunLight, lampLight, total } = await JSON.parse(packet.payload);

      const lightinstances = await new lightDataModel({
        deviceName: client.id,
        sunLight,
        lampLight,
        total,
        location,
      });
      const res = await lightinstances.save();

      publish = true;
    }
    if (publish) {
      if (debug) {
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
      }

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

  if (client.allowed && !client.admin) client._keepaliveInterval = 12000;
  console.log("Keepalive timeout: " + client._keepaliveInterval);
  //aedes.publish({ topic: 'setup/profile', payload: {name:"edge-01",location:"helldomen",shaft:2,version:2,profileName:"kongensmann"},username:"per",password:"test"});
});

// fired when a client disconnects
// when edge device disconnects  update online status
aedesWS.on("clientDisconnect", async function (client) {
  console.log(
    "Client Disconnected: \x1b[31m" + (client ? client.id : client) + "\x1b[0m",
    "to broker",
    aedesWS.id
  );
  aedesWS.on("published", function (packet, client) {
    console.log("Message published:", packet.payload.toString());
  });
  const device = await deviceModel.updateOne(
    { deviceName: client.id },
    { $set: { online: false } }
  );
});
// if device stop broadcasting send mail and notifaction too user
aedesWS.on("keepaliveTimeout", async function (client) {
  console.log(
    "Client LOST CONNECTION: \x1b[31m" +
      (client ? client.id : client) +
      "\x1b[0m",
    "to broker",
    aedesWS.id
  );
  const data = {
    title: `Type:keepaliveTimeout`,
    body: `device ${client.id} mqtt connection or wifi`,
    sound: "default",
    data: { screen: "Devices", location: "" },
  };
  const users = await userModel.find({
    tokens: { $exists: true, $ne: [] },
  });
  for (const user of users) {
    const responses = await sendNotification(user.tokens, data);
    console.log(responses);
    await addTokenstoDBForChecking(responses, user);
  }

  const device = await deviceModel.updateOne(
    { deviceName: client.id },
    { $set: { online: false } }
  );

  sendDeviceAlarm(
    client.id,
    "device lost mqtt connection or wifi",
    "keepaliveTimeout"
  );
  // TODO: send notifcation
  client.close();
});

aedesWS.keepalive = 3000;
aedesWS.heartbeatInterval = 3000;
