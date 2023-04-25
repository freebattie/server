import express from "express";
import { locationModel } from "../models/locationModel.js";
import { lightDataModel } from "../models/lightDataModel.js";
const DAY = 1;
const WEEK = 7;
export function locations() {
  const route = express.Router();
  route.get("/", async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const locations = await locationModel.find();

    return res.json(locations);
  });
  route.post("/", async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    if (req.role != "admin") {
      return res.sendStatus(403);
    }
    const { location, city } = req.body;
    console.log("====================================");
    console.log(location);
    console.log("====================================");
    const oldLoc = await locationModel.findOne({ location: location.location });
    if (oldLoc) {
      return res.status(409).json({ message: "Location already exists" });
    } else {
      const loc = await new locationModel({ location, city });
      loc.save();
      res.status(201).json(loc);
    }
  });
  route.delete("/", async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    if (req.role != "admin") {
      return res.sendStatus(403);
    }
    const { _id } = req.body;

    const oldLoc = await locationModel.findOne({ _id });

    if (oldLoc) {
      const run = await locationModel.deleteOne({ _id });
      return res.json(run);
    }
    return res.status(409).json({ message: "Location was not found" });
  });
  route.put("/", async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    if (req.role != "admin") {
      return res.sendStatus(403);
    }
    const { _id, location, city } = req.body;
    const data = { location, city };
    console.log("====================================");
    console.log(data);
    console.log("====================================");
    const loc = await locationModel.updateOne({ _id }, { $set: data });
    if (loc.nModifed == 0) {
      res.status(404).json({ message: "Location not found" });
    } else {
      return res.status(200).json(loc);
    }
  });
  route.get("/:id", async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const { id } = req.params;
    console.log("====================================");
    console.log("got here ", id);
    console.log("====================================");
    const found = await locationModel.findOne({ _id: id });
    console.log(found);
    if (found) {
      return res.status(200).json(found);
    }
    res.status(404).json({ message: "Location not found" });
  });

  route.get(":location/week/light", async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    let timeSpan = new Date();
    const location = req.params.location;
    timeSpan.setDate(timeSpan.getDate() - WEEK);
    const timeSpanUTC = new Date(timeSpan.toISOString());
    const lightData = await lightDataModel
      .find({
        location: location,
        createdAt: { $gte: timeSpanUTC },
      })
      .toArray();

    return res.json(lightData);
  });

  route.get(":location/day/live", async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    let timeSpan = new Date();
    const location = req.params.location;
    timeSpan.setDate(timeSpan.getDate() - DAY);
    const timeSpanUTC = new Date(timeSpan.toISOString());
    const lightData = await lightDataModel
      .find({
        location: location,
        createdAt: { $gte: timeSpanUTC },
      })
      .toArray();

    return res.json(lightData);
  });

  // TODO: ALL BELOW

  return route;
}
