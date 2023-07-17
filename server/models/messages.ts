import { User } from "./index.js";
import verifyJWT from "../utils/verifyJWT.js";
import { MessageTo, findOrAddChannel } from "./channels.js";
import { redis } from "../models/redis.js";
import dayjs from "dayjs";
import { Types } from "mongoose";
import { ExpressError } from "../utils/errorHandler.js";

interface InsertData {
  from: string;
  content: string;
  type: "text" | "image" | "system";
}

export const sendingMessages = async (
  from: string,
  to: MessageTo,
  message: string | undefined,
  location: string | undefined,
  messageType: InsertData["type"] = "text"
): Promise<Types.ObjectId> => {
  const { userId } = await verifyJWT(from);
  const foundUser = await User.findById(userId);
  const CURR_TIME = dayjs();

  const foundChannel = await findOrAddChannel(userId, to);
  if (!foundChannel) throw new ExpressError("Channel not found", 404);

  const insertData: InsertData[] = [];

  if (message) insertData.push({ from: userId, content: message, type: messageType });

  if (location) insertData.push({ from: userId, content: location, type: "image" });

  await foundChannel.updateOne(
    {
      $push: {
        messages: {
          $each: insertData,
          $sort: { createdAt: -1 },
        },
      },
    },
    { runValidators: true }
  );

  await foundChannel.save();

  foundChannel.members.forEach((member) => {
    redis.publish(
      "message.user-notification",
      JSON.stringify({ event: "notification", userId: member, channelId: foundChannel._id })
    );
    // connections.to(`userId:${member}`).emit("notification", { to: foundChannel._id });
  });

  insertData.forEach((data) => {
    const response = {
      to: foundChannel._id,
      message: {
        username: foundUser?.username,
        avatarURL: foundUser?.avatarURL,
        time: CURR_TIME,
        text: data.content,
        type: data.type,
      },
    };
    redis.publish("message.room-message", JSON.stringify({ event: "message", channelId: foundChannel._id, response }));
    // connections.to(`roomId:${foundChannel._id}`).emit("message", response);
  });

  return foundChannel._id;
};
