const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

router.get("", async (req, res, next) => {
  try {
    const token = process.env.ACCESSTOKEN;
    if (!token)
      return res.status(500).json({ error: "Instagram token not set" });

    const number_posts_to_fetch = 4;
    const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${number_posts_to_fetch}&access_token=${token}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorJson = await response.json();
      return res.status(response.status).json(errorJson);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
