import { promises as fs } from "fs";
export const readVersion = async (path) => {
  let max = 0;
  try {
    const files = await fs.readdir(path);
    await Promise.all(
      files.map(async (file) => {
        const val = parseInt(file.split("-")[2].split(".")[0].split("v")[1]);
        if (max < val) {
          max = val;
        }
      })
    );
    return max;
  } catch (err) {
    console.log(err);
  }
};
