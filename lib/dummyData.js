import { lightDataModel } from "../models/lightDataModel.js";
import { liveDataModel } from "../models/liveDataModel.js";

export const createLiveData = async () => {
  const date = new Date();

  date.setDate(date.getDate() - 1);
  const max = 6 * 24;
  const lux = [350, 340, 233, 444, 350, 370, 250, 150, 600, 0];
  const temp = [23, 25, 26, 30, 30, 25, 24, 26, 27, 31];
  const humidity = [60, 55, 55, 60, 65, 70, 60, 55, 60, 60];
  for (let index = 0; index < max; index++) {
    let rand = Math.floor(Math.random() * 10);
    date.setMinutes(date.getMinutes() + 10);
    const data = new liveDataModel({
      deviceName: "edge-01",
      lux: lux[rand],
      temp: temp[rand],
      humidity: humidity[rand],
      location: "grn-loc-1".toLocaleLowerCase(),
    });
    data.createdAt = date;
    await data.save();
  }
};
export const createLightData = async () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  const max = 7;
  const time = [2, 4, 2, 8, 1, 4, 5, 5, 3, 4];

  for (let index = 0; index < max; index++) {
    let rand = Math.floor(Math.random() * 10);
    let rand2 = Math.floor(Math.random() * 10);
    date.setDate(date.getDate() + 1);
    const total = time[rand] + time[rand2];
    const data = new lightDataModel({
      deviceName: "edge-01",
      sunLight: time[rand],
      lampLight: time[rand2],
      total: total,
      location: "grn-loc-1".toLocaleLowerCase(),
    });
    data.createdAt = date;
    await data.save();
  }
};
