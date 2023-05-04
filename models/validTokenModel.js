import { mongoose } from "mongoose";
mongoose.set("strictQuery", true);

const validTokenSchema = mongoose.Schema(
  {
    ticketId: String,
    token: String,
    done: Boolean,
  },
  { timestamps: true }
);

export const ValidTokenModel = mongoose.model("validToken", validTokenSchema);
