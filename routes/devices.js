import express from "express";
import { deviceModel } from "../models/deviceModel.js";
export function devices() {
  const route = express.Router();
  route.get("/", async (req, res) => {
    const devices = await deviceModel.find();

    return res.json(devices);
  });

  route.get("/:id", async (req, res) => {
    const _id = req.params.id;
    const device = await deviceModel.findOne({ _id }).toArray();

    return res.json(device);
  });
  route.put("/:id", async (req, res) => {
    const name = req.params.id;
    const { _id, deviceName, location, city, fw, build, auto, active, status } =
      req.body;
    const devicePut = {
      deviceName,
      location,
      city,
      fw,
      build,
      auto,
      active,
      status,
    };
    const device = await deviceModel
      .updateOne({ _id }, { $set: devicePut })
      .catch((err) => console.error(`update failed with error: ${err}`));
    console.log("changed : \n" + devicePut);
    return res.sendStatus(204);
  });
  route.put("/:id/status", async (req, res) => {
    const _id = req.params.id;
    const status = req.body;
    const device = await deviceModel
      .updateOne({ _id }, { $set: status })
      .catch((err) => console.error(`update failed with error: ${err}`));
    console.log("changed : \n" + device);
    return res.sendStatus(204);
  });

  return route;
}
