import express from "express";
import { locationModel } from "../models/locationModel.js";
import { lightDataModel } from "../models/lightDataModel.js";
import { liveDataModel } from "../models/liveDataModel.js";
import { alarmModel } from "../models/alarmModel.js";
import { aedesWS } from "./wsmqtt.js";
const DAY = 1;
const WEEK = 7;
export function locations() {
  const route = express.Router();
  route.get("/", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const locations = await locationModel.find();

    return res.json(locations);
  });
  route.post("/", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    if (req.role != "admin") return res.sendStatus(403);

    const { location, city } = req.body;

    const oldLoc = await locationModel.findOne({
      location: location.toLowerCase(),
    });
    if (oldLoc) {
      return res.status(409).json({ message: "Location already exists" });
    } else {
      const loc = await new locationModel({
        location: location.toLowerCase(),
        city: city.toLowerCase(),
      });
      await loc.save();

      try {
        res.status(201).json(loc);
      } catch (error) {
        console.log("====================================");
        console.log("error", error);
        console.log("====================================");
      }
    }
  });
  route.delete("/", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    if (req.role != "admin") return res.sendStatus(403);

    const { _id } = req.body;
    console.log(_id);
    const oldLoc = await locationModel
      .findOne({ _id })
      .then()
      .catch((e) => console.log(e));

    if (oldLoc) {
      const run = await locationModel.deleteOne({ _id });
      return res.json(run);
    } else return res.status(409).json({ message: "Location was not found" });
  });
  route.put("/", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    if (req.role != "admin") return res.sendStatus(403);

    const { _id, location, city } = req.body;
    const data = { location: location.toLowerCase(), city: city.toLowerCase() };
    console.log("====================================");
    console.log("put data", data);
    console.log("====================================");
    try {
      const loc = await locationModel.findOneAndUpdate({ _id }, data, {
        new: true,
      });
      if (!loc) res.status(404).json({ message: "Location not found" });
      const message = {
        topic: "locations/update",
        payload: JSON.stringify({
          city: loc.city,
          location: loc.location.toLowerCase(),
        }),
      };
      console.log("loc is  is", message);
      aedesWS.publish(message);
      return res.status(200).json(loc);
    } catch (error) {
      console.log("errror", error);
    }
  });
  route.get("/:id", async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const { id } = req.params;

    const found = await locationModel.findOne({ _id: id });

    if (found) return res.status(200).json(found);
    else res.status(404).json({ message: "Location not found" });
  });
  route.get("/:location/logs", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { location } = req.params;
    const names = await alarmModel.distinct("name");
    const types = await alarmModel.distinct("type");
    console.log(types);
    const list = [];
    for (const name of names) {
      for (const type of types) {
        const alarm = await alarmModel
          .find({
            name,
            type,
            location: location.toLowerCase(),
          })
          .sort({ createdAt: -1 })
          .limit(1);
        console.log(alarm);
        if (alarm.length > 0) {
          list.push(alarm[0]);
        }
      }
    }
    console.log("====================================");
    console.log("length of list", list.length);
    console.log("====================================");

    if (list) {
      return res.status(200).json(list);
    } else res.status(404).json({ message: "No logs was found" });
  });
  route.get("/:location/logs/alarms", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { location } = req.params;
    const names = ["door", "window", "heater"];
    const list = [];
    for (const name of names) {
      const alarm = await alarmModel
        .find({
          type: "ALARM",
          location: location.toLowerCase(),
          name: name,
        })
        .sort({ createdAt: -1 })
        .limit(1);
      list.push(alarm[0]);
    }

    if (list) {
      return res.status(200).json(list);
    } else res.status(404).json({ message: "No logs was found" });
  });
  route.get("/:location/light/:time", async (req, res) => {
    //todo: if start of year
    const time = req.params.time;
    const location = req.params.location;
    console.log("getting here");
    if (!req.user) {
      return res.sendStatus(401);
    }
    let timeSpan = new Date();
    timeSpan.setDate(timeSpan.getDate() - time);

    const lightData = await lightDataModel
      .find({ location, createdAt: { $gte: timeSpan } })
      .limit(time);

    return res.json(lightData);
  });

  route.get("/:location/data/:time", async (req, res) => {
    const time = req.params.time;
    const location = req.params.location;

    if (!req.user) {
      return res.sendStatus(401);
    }

    let timeSpan = new Date();
    timeSpan.setHours(timeSpan.getHours() - time);

    console.log("testing", timeSpan);
    let dataIntervl = await liveDataModel
      .find({
        location,
        createdAt: { $gte: timeSpan },
      })
      .catch((e) => console.log("error", e));
    console.log("what here ", dataIntervl);

    return res.json(dataIntervl);
  });

  return route;
}
