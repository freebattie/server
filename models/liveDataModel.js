import { mongoose } from "mongoose";
mongoose.set("strictQuery", true);

const liveDataSchema = mongoose.Schema(
  {
    deviceName: String,
    location: String,
    lux: Number,
    temp: Number,
    humidity: Number,
  },
  { timestamps: true }
);

export const liveDataModel = mongoose.model("LiveData", liveDataSchema);
