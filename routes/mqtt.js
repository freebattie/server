import Aedes from "aedes";
import { sendMail } from "../lib/mail.js";
import { getWeatherData } from "../lib/weather.js";
import { deviceModel, ActiveDeviceModel } from "../models/deviceModel.js";
import { alarmModel } from "../models/alarmModel.js";
import { liveDataModel } from "../models/liveDataModel.js";
import { lightDataModel } from "../models/lightDataModel.js";
import net from "https";
const https = net;

//const api_key = "523956835871b2c18c5357e09cbe3618";// needs to be in an .env file but low on time
import mail from "nodemailer";
const nodemailer = mail;
import dotenv from "dotenv";
dotenv.config();
const TEN_MIN = 10 * 60 * 1000;
//import { LoggingData, LoggingProfile } from "../models/loggingDataModel.js";
//import { deviceProfile } from "../models/edgeDeviceModel.js";
export const aedes = new Aedes({ keepalive: 0, heartbeatInterval: 60000 });
dotenv.config();

const handelDataModelTopics = async (packet, filter1, filter2) => {
  if (packet.topic.includes(filter1)) {
    if (packet.topic.includes(filter2)) {
      //let peyload = JSON.stringify(packet.payload);
      const { max, min, type, location, deviceName, door, profileName } =
        await JSON.parse(packet.payload);
      let [elevator, loc, city] = location.split("-");
      console.log(city);
      if (filter2 === "alarm") {
        if (type == "alarm") {
          let msg = { elv: elevator, loc: loc, max, min };
          sendMail(msg);
        }

        getWeatherData(city).then(async (windSpeed) => {
          /*   const loggingDataInstance = await new LoggingData({
              max, min, type, location, deviceName, door, profileName, windSpeed
            });
            const res = await loggingDataInstance.save(); */
          console.log("saved:", res);
        });
      } else if (filter2 === "calibration") {
        getWeatherData(city).then(async (windSpeed) => {
          /*  const loggingDataInstance = await new LoggingProfile({
             max, min, type, location, deviceName, door, profileName, windSpeed
           }); */
          /* let oldProfile = await LoggingProfile.findOne({ deviceName })
          if (oldProfile) {

            let res;
            oldProfile.overwrite({ max, min, type, location, deviceName, door, profileName, windSpeed })
            res = await oldProfile.save();
            console.log(res);
          }
          else {
            let res = await loggingDataInstance.save();
            console.log(res);
          } */
        });
      }
    }
  }
};

const handelProfileTopic = async (packet) => {
  if (packet.topic.includes("profile")) {
    //let peyload = JSON.stringify(packet.payload);
    /*  const { deviceName, location, profileName, version, shaft } = await JSON.parse(packet.payload)
     const profile = new deviceProfile(await JSON.parse(packet.payload))
     let oldProfile = await deviceProfile.findOne({ profileName })
 
     if (oldProfile) {
 
       let res;
       oldProfile.overwrite({ deviceName, location, profileName, version, shaft })
       res = await oldProfile.save();
       console.log(res);
     }
     else {
       let res = await profile.save();
       console.log(res);
     } */
  }
};

export function aedesHandel() {
  aedes.authenticate = (client, username, password, callback) => {
    console.log("MQTT client \x1b[32m" + (client ? client.id : client));
    console.log("username", username, client.password, password);
    callback(null, true);
  };
  aedes.authorizePublish = async (client, packet, callback) => {
    if (packet.topic.startsWith("$SYS/")) {
      return callback(new Error("$SYS/" + " topic is reserved"));
    }

    console.log(
      "Client \x1b[31m" +
        (client ? client.id : "BROKER_" + aedes.id) +
        "\x1b[0m has published",
      packet.payload.toString(),
      "on",
      packet.topic,
      "to broker",
      aedes.id
    );

    if (packet.topic === "devices") {
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
      console.log(
        "Client \x1b[31m" +
          (client ? client.id : "BROKER_" + aedes.id) +
          "\x1b[0m has published",
        packet.payload.toString(),
        "on",
        packet.topic,
        "to broker",
        aedes.id
      );
      return callback(null);
    } else if (packet.topic.endsWith("/alarm")) {
      const location = packet.topic.split("/")[0];
      const { type, name, status } = await JSON.parse(packet.payload);

      const alarminstances = await new alarmModel({
        deviceName: client.id,
        name,
        location,
        type,
        status,
      });
      const res = alarminstances.save();
      console.log(
        "Client \x1b[31m" +
          (client ? client.id : "BROKER_" + aedes.id) +
          "\x1b[0m has published",
        packet.payload.toString(),
        "on",
        packet.topic,
        "to broker",
        aedes.id
      );
      return callback(null);
    } else if (packet.topic.endsWith("/live")) {
      const location = packet.topic.split("/")[0];
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

      console.log(
        "Client \x1b[31m" +
          (client ? client.id : "BROKER_" + aedes.id) +
          "\x1b[0m has published",
        packet.payload.toString(),
        "on",
        packet.topic,
        "to broker",
        aedes.id
      );
      return callback(null);
    } else if (packet.topic.endsWith("/light")) {
      const location = packet.topic.split("/")[0];
      const { sunlight, lamplight, total } = await JSON.parse(packet.payload);

      const lightinstances = await new lightDataModel({
        deviceName: client.id,
        sunlight,
        lamplight,
        total,
        location,
      });
      const res = lightinstances.save();
      console.log(
        "Client \x1b[31m" +
          (client ? client.id : "BROKER_" + aedes.id) +
          "\x1b[0m has published",
        packet.payload.toString(),
        "on",
        packet.topic,
        "to broker",
        aedes.id
      );
      return callback(null);
    } else if (packet.topic.endsWith("/live")) {
      const location = packet.topic.split("/")[0];
      const { device, lux, temp, humidity } = await JSON.parse(packet.payload);

      const alarminstances = await new alarmModel({
        deviceName: device,
        lux,
        temp,
        humidity,
        location,
      });
      const res = alarminstances.save();
      console.log(
        "Client \x1b[31m" +
          (client ? client.id : "BROKER_" + aedes.id) +
          "\x1b[0m has published",
        packet.payload.toString(),
        "on",
        packet.topic,
        "to broker",
        aedes.id
      );
      return callback(null);
    } else {
      return callback(null);
      const settings = client;
      const passBuff = client._parser.settings.password;
      const username = client._parser.settings.username;
      const pass = passBuff.toString("utf8");
      console.log("client is: ", pass);
      if ((client.password = "test")) {
        return callback(null);
      } else {
        return new Error("Not authorized");
      }
    }
  };

  aedes.authorizeSubscribe = (client, subscriptions, callback) => {
    console.log(
      "MQTT client \x1b[32m" +
        (client ? client.id : client) +
        "\x1b[0m subscribed to topics: ",
      aedes.id
    );
  };

  aedes.on("subscribe", function (subscriptions, client) {
    console.log(
      "MQTT client \x1b[32m" +
        (client ? client.id : client) +
        "\x1b[0m subscribed to topics: " +
        subscriptions.map((s) => s.topic).join("\n"),
      "from broker",
      aedes.id
    );
  });

  aedes.on("unsubscribe", function (subscriptions, client) {
    console.log(
      "MQTT client \x1b[32m" +
        (client ? client.id : client) +
        "\x1b[0m unsubscribed to topics: " +
        subscriptions.join("\n"),
      "from broker",
      aedes.id
    );
  });

  // fired when a client connects
  aedes.on("client", function (client) {
    console.log(
      "Client Connected: \x1b[33m" + (client ? client.id : client) + "\x1b[0m",
      "to broker",
      aedes.id
    );
    client._keepaliveInterval;
    console.log("Keepalive timeout: " + client._keepaliveInterval);
    //aedes.publish({ topic: 'setup/profile', payload: {name:"edge-01",location:"helldomen",shaft:2,version:2,profileName:"kongensmann"},username:"per",password:"test"});
  });

  // fired when a client disconnects
  // send alarm when edge device disconnects and remove from list
  aedes.on("clientDisconnect", function (client) {
    console.log(
      "Client Disconnected: \x1b[31m" +
        (client ? client.id : client) +
        "\x1b[0m",
      "to broker",
      aedes.id
    );
  });
  aedes.on("keepaliveTimeout", async function (client) {
    console.log(
      "Client LOST CONNECTION: \x1b[31m" +
        (client ? client.id : client) +
        "\x1b[0m",
      "to broker",
      aedes.id
    );
  });

  // fired when a message is published
  /*  aedes.on('publish', async function (packet, client) {
     //TODO: check intervall (30 min) for values and on change for true/false and save to db else dont save
     try {
       if (!packet.topic.includes("$SYS")) {
 
         await handelDataModelTopics(packet, "logging", "alarm");
         await handelDataModelTopics(packet, "setup", "calibration");
         await handelProfileTopic(packet);
 
 
 
       }
     } catch (err) {
       console.log("error:", err);
     }
 
     console.log('Client \x1b[31m' + (client ? client.id : 'BROKER_' + aedes.id) + '\x1b[0m has published', packet.payload.toString(), 'on', packet.topic, 'to broker', aedes.id)
   }) */

  return aedes.handle;
}
