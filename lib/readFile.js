import { promises as fs } from "fs";
import { aedesWS } from "../routes/wsmqtt.js";

export const readVersion = async (path) => {
  let max = 0;
  try {
    const files = await fs.readdir(path);
    await Promise.all(
      files.map(async (file) => {
        if (file.startsWith("fw-")) {
          const val = parseInt(file.split("-")[2].split(".")[0].split("v")[1]);
          if (max < val) {
            max = val;
          }
        }
      })
    );

    return max;
  } catch (err) {
    console.log(err);
  }
};
export async function updateFW() {
  try {
    const devFW = await readVersion("./fw/dev");
    const prodFW = await readVersion("./fw/prod");

    const data = [
      {
        fw: devFW,
        build: "dev",
      },
      {
        fw: prodFW,
        build: "prod",
      },
    ];
    let msg = JSON.stringify(data);
    const message = {
      topic: "update",
      payload: msg,
    };

    aedesWS.publish(message);
  } catch (err) {
    console.error(err);
  }

  // call the function again after a delay
  setTimeout(updateFW, 10000);
}
