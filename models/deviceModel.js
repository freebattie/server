import { mongoose } from "mongoose";
mongoose.set("strictQuery", true);

const edgeDeviceSchema = mongoose.Schema(
  {
    deviceName: String,
    location: String,
    city: String,
    fw: Number,
    build: String,
    auto: Boolean,
    mqttPass: String,
    active: Boolean,
    status: Boolean,
  },
  { timestamps: true }
);

export const deviceModel = mongoose.model("Device", edgeDeviceSchema);
export const ActiveDeviceModel = mongoose.model(
  "ActiveDevice",
  edgeDeviceSchema
);
