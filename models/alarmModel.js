import { mongoose } from "mongoose";
mongoose.set("strictQuery", true);

const edgeDeviceAlarmSchema = mongoose.Schema(
  {
    deviceName: String,
    location: String,
    name: String,
    type: String,
    status: Boolean,
  },
  { timestamps: true }
);

export const alarmModel = mongoose.model("Alarm", edgeDeviceAlarmSchema);
