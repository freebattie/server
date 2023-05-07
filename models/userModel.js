import { mongoose } from "mongoose";
mongoose.set("strictQuery", true);

const luserSchema = mongoose.Schema({
  name: String,
  userName: String,
  password: String,
  role: String,
});

export const userModel = mongoose.model("user", luserSchema);
