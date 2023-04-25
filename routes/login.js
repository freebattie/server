import express from "express";

import { userModel } from "../models/userModel.js";
import {
  decrypt,
  encrypt,
  hashPassword,
  comparePassword,
} from "../lib/crypto.js";

// Encryption function

const secretKey = process.env.KEY;
console.log("Example Secret Key:", secretKey);
console.log("==============KEYYYYY======================");
console.log(secretKey);
console.log("====================================");

export function requestUser() {
  return async (req, res, next) => {
    console.log("signed cookies:", req.signedCookies);
    let { username, role } = req.signedCookies;

    if (username) {
      username = await decrypt(username, process.env.KEY);
      role = await decrypt(role, process.env.KEY);
      console.log("====================================");
      console.log(username);
      console.log("====================================");

      console.log("cleartext: ", username);
      console.log("trying to get the cokcie", username);
      const users = await userModel.find();

      req.user = users.find((u) => u.userName === username);
      req.role = users.map((u) => {
        return u.userName === username ? u.role : null;
      })[0];
    }

    next();
  };
}
export function userLogin() {
  const route = express.Router();
  route.get("/", (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const { userName, role } = req.user;
    return res.json({ userName, name: userName, role });
  });

  route.post("/", async (req, res) => {
    const { username, password } = req.body;
    if (username === "" || password === "") {
      return res.sendStatus(401);
    }

    const users = await userModel.find();

    const user = users.find((u) => {
      return u.userName.toLowerCase() === username.toLowerCase()
        ? username
        : null;
    });

    console.log("user is ", user);
    if (!user) {
      return res.sendStatus(401);
    }
    if (await comparePassword(password, user.password)) {
      let usrname = await encrypt(user.userName, process.env.KEY);
      let rle = await encrypt(user.role, process.env.KEY);
      res.cookie("username", usrname, {
        signed: true,
        maxAge: 60 * 60 * 1000,
        httpOnly: true,
      });
      res.cookie("role", rle, {
        signed: true,
        maxAge: 60 * 60 * 1000,
        httpOnly: true,
      });
      res.sendStatus(200);
    } else return res.sendStatus(401);
  });

  route.post("/new", async (req, res, next) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    if (req.role != "admin") {
      return res.sendStatus(403);
    }
    const { username, password } = req.body;

    if (username === "" || password === "") {
      return res.sendStatus(401);
    }
    const users = await userModel.find();

    const user = await users.filter((u) => {
      return u.userName.toLowerCase() === username.toLowerCase();
    });

    if (user.length > 0) {
      return res.sendStatus(409);
    }
    const result = new userModel({
      name: username,
      userName: username.toLowerCase(),
      password: await hashPassword(password),
      role: "user",
    });
    result.save();
    console.log("saved");
    res.sendStatus(200);
  });

  route.delete("/", (req, res) => {
    res.clearCookie("username");
    res.clearCookie("role");
    res.sendStatus(204);
  });

  return route;
}
