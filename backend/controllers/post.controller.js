import Notification from "../models/notification.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import {
  render400Error,
  render401Error,
  render404Error,
  render500Error,
} from "../utils/error.js";
import { render200Success } from "../utils/success.js";
import { v2 as cloudinary } from "cloudinary";

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    return render200Success(
      res,
      "Posts fetched successfully!",
      posts.length === 0 ? [] : posts
    );
  } catch (error) {
    console.error(`Error in getAllPosts method: ${error.message}`);
    return render500Error(res);
  }
};

export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body;

    const userId = req.user._id.toString();
    const user = await User.findById(userId);
    if (!user) return render404Error(res, "User not found!");

    if (!text && !img) {
      return render400Error(res, "Post must have text or image!");
    }

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    const newPost = new Post({
      user: userId,
      text,
      img,
    });
    await newPost.save();
    return render200Success(res, "Post created successfully!", newPost);
  } catch (error) {
    console.error(`Error in createPost method: ${error.message}`);
    return render500Error(res);
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return render404Error(res, "Post not found!");

    const doesUserAlreadyLikedThePost = post.likes.includes(userId);
    if (doesUserAlreadyLikedThePost) {
      // unlike the post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPost: postId } });
      const updatedLikes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
      return render200Success(res, "Post unliked successfully!", updatedLikes);
    } else {
      // like the post
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPost: postId } });
      await post.save();

      const notification = new Notification({
        from: userId,
        to: post.user,
        type: "like",
      });
      await notification.save();
      const updatedLikes = post.likes;

      return render200Success(res, "Post liked successfully!", updatedLikes);
    }
  } catch (error) {
    console.error(`Error in likeUnlikePost method: ${error.message}`);
    return render500Error(res);
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    if (!text) return render400Error(res, "Text field is required!");

    const post = await Post.findById(postId);
    if (!post) return render404Error(res, "Post not found!");

    const comment = { user: userId, text };
    post.comments.push(comment);
    await post.save();

    render200Success(res, "Comment added successfully!", post);
  } catch (error) {
    console.error(`Error in commentOnPost method: ${error.message}`);
    return render500Error(res);
  }
};

export const deletePost = async (req, res) => {
  const postId = req.params.id;
  try {
    const post = await Post.findById(postId);
    if (!post) return render404Error(res, "Post not found!");

    if (post.user.toString() !== req.user._id.toString()) {
      return render401Error(res, "You are not authorized to delete this post!");
    }

    if (post.img) {
      const imgId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    await Post.findByIdAndDelete(postId);
    return render200Success(res, "Post deleted successfully!");
  } catch (error) {
    console.error(`Error in deletePost method: ${error.message}`);
    return render500Error(res);
  }
};

export const getLikedPosts = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) render404Error(res, "User not found!");

    const likedPost = await Post.find({ _id: { $in: user.likedPost } })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    render200Success(res, "Retrieve liked posts successfully!", likedPost);
  } catch (error) {
    console.error(`Error in getLikedPosts method: ${error.message}`);
    return render500Error(res);
  }
};

export const getFollowingPosts = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) render404Error(res, "User not found!");

    const following = user.following;
    const feedPosts = await Post.find({ user: { $in: following } })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    render200Success(res, null, feedPosts);
  } catch (error) {
    console.error(`Error in getFollowingPosts method: ${error.message}`);
    return render500Error(res);
  }
};

export const getUserPosts = async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username });
    if (!user) render404Error(res, "User not found!");

    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    return render200Success(res, null, posts);
  } catch (error) {
    console.error(`Error in getFollowingPosts method: ${error.message}`);
    return render500Error(res);
  }
};
