import { mongoose } from "mongoose";
mongoose.set("strictQuery", true);
const locationSchema = mongoose.Schema({
  location: String,
  city: String,
});

export const locationModel = mongoose.model("location", locationSchema);
