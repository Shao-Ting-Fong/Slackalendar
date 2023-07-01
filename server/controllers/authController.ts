import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import signJWT, { EXPIRE_TIME } from "../utils/signJWT.js";
import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";
import { nanoid } from "nanoid";
import verifyJWT from "../utils/verifyJWT.js";
import ExpressError from "../utils/ExpressError.js";
import { User } from "../models/index.js";
import path from "path";

const saltRounds = 10;
const __dirname = path.resolve();

export const signup = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const hashPassword = await bcrypt.hash(password, saltRounds);

    const avatar = await createAvatar(thumbs, {
      seed: username,
      radius: 50,
    });

    const png = await avatar.png();

    const avatarURL = `/avatar/${nanoid()}.png`;
    await png.toFile(path.join(__dirname, `/public${avatarURL}`));

    const newUser = new User({
      ...req.body,
      password: hashPassword,
      avatarURL,
      provider: "native",
    });
    await newUser.save();
    const token = await signJWT(newUser._id);
    res.status(200).json({
      data: {
        access_token: token,
        access_expired: EXPIRE_TIME,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          avatarURL: newUser.avatarURL,
          provider: newUser.provider,
        },
      },
    });
  } catch (err) {
    console.log(err);
    if (err instanceof Error) {
      res.status(400).json({ errors: err.message });
      return;
    }
    res.status(500).json({ errors: "sign up failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username });
    if (!foundUser) {
      throw new ExpressError("Invalid username or password", 401);
    }
    const isValidPassword = await bcrypt.compare(password, foundUser.password);
    if (!isValidPassword) {
      throw new ExpressError("Invalid username or password", 401);
    }

    const token = await signJWT(foundUser._id);
    res.status(200).json({
      data: {
        access_token: token,
        access_expired: EXPIRE_TIME,
        user: {
          id: foundUser._id,
          username: foundUser.username,
          email: foundUser.email,
          avatarURL: foundUser.avatarURL,
          provider: foundUser.provider,
        },
      },
    });
  } catch (err) {
    if (err instanceof ExpressError) {
      res.status(err.statusCode).json({ errors: err.message });
      return;
    } else if (err instanceof Error) {
      res.status(400).json({ errors: err.message });
      return;
    }
    res.status(500).json({ errors: "sign up failed" });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ExpressError("You need to sign in first.", 400);
    }
    const { userId } = await verifyJWT(token);
    const foundUser = await User.findById(userId).select(
      "_id username email avatarURL workspaces"
    );
    if (!foundUser) {
      throw new ExpressError("User not found", 404);
    }

    res.status(200).json(foundUser);
  } catch (err) {
    if (err instanceof ExpressError) {
      res.status(err.statusCode).json({ errors: err.message });
      return;
    } else if (err instanceof Error) {
      res.status(400).json({ errors: err.message });
      return;
    }
    res.status(500).json({ errors: "get profile failed" });
  }
};
