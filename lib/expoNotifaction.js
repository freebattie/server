import { Expo } from "expo-server-sdk";

import { ValidTokenModel } from "../models/validTokenModel.js";
import { userModel } from "../models/userModel.js";
export const sendNotification = async (expoPushTokens, data) => {
  const expo = new Expo({ accessToken: process.env.ACCESS_TOKEN });

  const chunks = expo.chunkPushNotifications(
    expoPushTokens.map((token) => {
      return { to: token, ...data };
    })
  );
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error(error);
    }
  }

  let responses = [];

  for (const ticket of tickets) {
    if (ticket.status === "error") {
      if (ticket.details && ticket.details.error === "DeviceNotRegistered") {
        const index = chunks.indexOf(ticket);
        responses[index] = "DeviceNotRegistered";
      }
    }

    if (ticket.status === "ok") {
      const index = tickets.indexOf(ticket);
      console.log("ticket index ", index);
      responses[index] = ticket.id;
    }
  }

  return responses;
};

export const getReceipt = async (receiptId) => {
  const expo = new Expo({ accessToken: process.env.ACCESS_TOKEN });

  let receiptIdChunks = expo.chunkPushNotificationReceiptIds([receiptId]);

  let receipt;

  for (const chunk of receiptIdChunks) {
    try {
      receipt = await expo.getPushNotificationReceiptsAsync(chunk);
    } catch (error) {
      console.error(error);
    }
  }

  return receipt ? receipt[receiptId] : null;
};
export const checkPushReceiptStatus = async (ticketId, token) => {
  const receipt = await getReceipt(ticketId);

  if (receipt) {
    if (receipt.status === "ok") {
      console.log("message recived");

      await ValidTokenModel.findOneAndUpdate(
        { ticketId: ticketId },
        { done: true }
      );
    } else if (receipt.status === "error") {
      console.log(`Notification failed for ${token}: ${receipt.details.error}`);
      let user = await ValidTokenModel.findOneAndRemove(
        { ticketId: ticketId },
        { new: true }
      );
      userModel.findOneAndUpdate(
        { userName: user.username },
        {
          $pull: { tokens: token },
        }
      );
    }
  }
};

export const getTokensToCheck = async () => {
  // Query the database for all receipts that haven't been checked in the last 30 minutes
  const tokens = await ValidTokenModel.find({
    checkedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) }, // Only get receipts that were last checked more than 30 minutes ago
  });

  // Return an array of objects with the receiptId and expoPushToken fields
  return tokens.map((receipt) => ({
    receiptId: receipt.ticketId,
    expoPushToken: receipt.token,
  }));
};

export const checkTokens = async () => {
  console.log("checking for id");
  // Get all the push receipts that need to be checked
  const tokensToCheck = await getTokensToCheck();

  // Loop through each receipt and check its status
  for (const token of tokensToCheck) {
    await checkPushReceiptStatus(token.receiptId, token.expoPushToken);
  }
};
export const addTokenstoDBForChecking = async (responses, user) => {
  for (const response of responses) {
    if (response == "DeviceNotRegistered") {
      const index = responses.indexOf(response);
      const token = user.tokens[index];
      const newUser = await userModel.findOneAndUpdate(
        { userName: user[index].userName },
        {
          $pull: { tokens: token },
        },
        { new: true }
      );
    } else {
      const index = responses.indexOf(response);
      const token = user.tokens[index];
      const validToken = ValidTokenModel.create({
        userName: user.userName,
        token: token,
        ticketId: response,
      });
    }
  }
};
