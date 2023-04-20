import { mongoose } from "mongoose";
mongoose.set("strictQuery", true);

const ligthDataSchema = mongoose.Schema(
  {
    deviceName: String,
    location: String,
    sunLight: Number,
    lampLight: Number,
    total: Number,
  },
  { timestamps: true }
);

export const lightDataModel = mongoose.model("LightData", ligthDataSchema);
