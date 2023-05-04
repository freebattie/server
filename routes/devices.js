import express from "express";
import { deviceModel } from "../models/deviceModel.js";
import { readVersion } from "../lib/readFile.js";
export function devices() {
  const route = express.Router();
  route.get("/", async (req, res) => {
    try {
      const devices = await deviceModel.find();

      return res.json(devices);
    } catch (error) {
      console.log(error);
    }
  });

  route.get("/:id", async (req, res) => {
    const _id = req.params.id;
    try {
      const device = await deviceModel.findOne({ _id });
      return res.json(device);
    } catch (error) {
      console.log("====================================");
      console.log("error", error);
      console.log("====================================");
    }
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
  route.get("/id/builds", async (req, res) => {
    try {
      const devFW = await readVersion("./fw/dev");
      const prodFW = await readVersion("./fw/prod");
      const data = { devFW, prodFW };

      return res.json(data);
    } catch (e) {
      console.log("errrer");
    }
  });

  return route;
}
