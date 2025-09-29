const express = require("express");
const router = express.Router();
const BlogPost = require("../Models/blog.Model");
const uploadMiddleware = require("../utils/upload_media");

const processBlogImage = async (req, res, next) => {
  try {
    if (req.file) {
      const uniqueFilename = uploadMiddleware.generateUniqueFilename(
        req.file.originalname
      );
      const result = await uploadMiddleware.uploadBufferToS3(
        req.file.buffer,
        uniqueFilename,
        req.file.mimetype,
        "evexia/blog/images"
      );

      req.file.url = result.url;
    }
    next();
  } catch (error) {
    console.error("Error processing blog image:", error);
    return res.status(500).json({
      message: "Error processing uploaded image",
      error: error.message,
    });
  }
};

router.get("/", async (req, res) => {
  try {
    const blogs = await BlogPost.find().sort({ date: -1 });
    res.json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    if (!req.body.id) {
      req.body.id = Date.now().toString();
    }
    const newBlog = new BlogPost(req.body);
    const savedBlog = await newBlog.save();
    res.status(201).json(savedBlog);
  } catch (error) {
    console.error("Error creating blog:", error);
    res
      .status(400)
      .json({ message: "Error creating blog post", error: error.message });
  }
});

router.post(
  "/upload",
  uploadMiddleware.uploadSingleImage,
  uploadMiddleware.handleMulterError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      const uniqueFilename = uploadMiddleware.generateUniqueFilename(
        req.file.originalname
      );

      const result = await uploadMiddleware.uploadBufferToS3(
        req.file.buffer,
        uniqueFilename,
        req.file.mimetype,
        "evexia/blog/images"
      );

      res.status(200).json({
        message: "Image uploaded successfully",
        file: {
          url: result.url,
          filename: uniqueFilename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
    } catch (error) {
      console.error("Error processing uploaded image:", error);
      res.status(500).json({
        message: "Error processing uploaded image",
        error: error.message,
      });
    }
  }
);

router.post(
  "/with-image",
  uploadMiddleware.uploadSingleImage,
  uploadMiddleware.handleMulterError,
  processBlogImage,
  async (req, res) => {
    try {
      if (!req.body.id) {
        req.body.id = Date.now().toString();
      }

      if (req.file && req.file.url) {
        req.body.imageUrl = req.file.url;
      }

      const newBlog = new BlogPost(req.body);
      const savedBlog = await newBlog.save();
      res.status(201).json(savedBlog);
    } catch (error) {
      console.error("Error creating blog:", error);
      res
        .status(400)
        .json({ message: "Error creating blog post", error: error.message });
    }
  }
);

router.put("/:id", async (req, res) => {
  try {
    if (req.body.id && req.body.id !== req.params.id) {
      return res.status(400).json({
        message: "Cannot change blog post ID",
      });
    }
    const blog = await BlogPost.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!blog) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    res.json(blog);
  } catch (error) {
    console.error("Error updating blog:", error);
    res
      .status(400)
      .json({ message: "Error updating blog post", error: error.message });
  }
});

router.put(
  "/:id/with-image",
  uploadMiddleware.uploadSingleImage,
  uploadMiddleware.handleMulterError,
  processBlogImage,
  async (req, res) => {
    try {
      if (req.body.id && req.body.id !== req.params.id) {
        return res.status(400).json({
          message: "Cannot change blog post ID",
        });
      }

      if (req.file && req.file.url) {
        req.body.imageUrl = req.file.url;
      }

      const blog = await BlogPost.findOneAndUpdate(
        { id: req.params.id },
        req.body,
        { new: true, runValidators: true }
      );
      if (!blog) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.json(blog);
    } catch (error) {
      console.error("Error updating blog:", error);
      res
        .status(400)
        .json({ message: "Error updating blog post", error: error.message });
    }
  }
);

router.delete("/:id", async (req, res) => {
  try {
    const blog = await BlogPost.findOneAndDelete({ id: req.params.id });
    if (!blog) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    res.json({ message: "Blog post deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/featured", async (req, res) => {
  try {
    const featuredPosts = await BlogPost.find({ showOnHomepage: true })
      .select("_id id title image")
      .sort({ date: -1 })
      .limit(3);

    res.json(featuredPosts);
  } catch (error) {
    console.error("Error fetching featured blog posts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const blog = await BlogPost.findOne({ id: req.params.id });
    if (!blog) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    res.json(blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
