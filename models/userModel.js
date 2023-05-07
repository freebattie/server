import { mongoose } from "mongoose";
mongoose.set("strictQuery", true);

const userSchema = mongoose.Schema({
  name: String,
  userName: String,
  password: String,
  role: String,
  tokens: [String],
});

export const userModel = mongoose.model("user", userSchema);
