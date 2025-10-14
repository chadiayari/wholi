// const expreconst stripeRouter = require("./routes/stripe");
// const ordersRouter = require("./routes/orders");
// dotenv.config();
// const app = express();
// app.use(cors());
// app.use(logger("dev"));
// app.use(compression());
const express = require("express");

// app.use(express.json());
// ("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const compression = require("compression");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./conn");
var authRouter = require("./middleware/authRoutes");
const contactRouter = require("./routes/contact");
const instagramRouter = require("./routes/instagram");
const stripeRouter = require("./routes/stripe");
const ordersRouter = require("./routes/orders");
const paymentsRouter = require("./routes/payments");
const adminRouter = require("./routes/admin");
dotenv.config();
const app = express();
app.use(cors());
app.use(logger("dev"));
app.use(compression());

// Stripe webhook endpoint needs raw body, must be before express.json()
app.use("/api/stripe", stripeRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API routes
app.use("/api/contact", contactRouter);
app.use("/api/auth", authRouter);
app.use("/api/instagram", instagramRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/admin", adminRouter);
// Static assets
app.use(
  express.static(path.join(__dirname, "public", "build"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      } else if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      } else if (path.endsWith(".ttf") || path.endsWith(".otf")) {
        res.setHeader("Content-Type", "font/ttf");
      } else if (path.endsWith(".svg")) {
        res.setHeader("Content-Type", "image/svg+xml");
      } else if (path.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (path.endsWith(".webp")) {
        res.setHeader("Content-Type", "image/webp");
      } else if (path.endsWith(".woff") || path.endsWith(".woff2")) {
        res.setHeader("Content-Type", "font/woff");
      }
    },
  })
);

// Special asset handling for specific routes
const routesWithAssets = ["contact", "admin"];
routesWithAssets.forEach((route) => {
  app.get(`/${route}/assets/*`, (req, res) => {
    const assetPath = req.path.replace(`/${route}/assets/`, "");
    res.sendFile(
      path.join(__dirname, "public", "build", "assets", assetPath),
      (err) => {
        if (err) {
          console.error(`Error serving asset at ${req.path}:`, err);
          res.status(404).send("Asset not found");
        }
      }
    );
  });
});

// Handle multi-level paths with assets
app.get("/*/*/assets/*", (req, res) => {
  const pathParts = req.path.split("/");
  const assetPath = pathParts.slice(pathParts.indexOf("assets") + 1).join("/");
  res.sendFile(
    path.join(__dirname, "public", "build", "assets", assetPath),
    (err) => {
      if (err) {
        console.error(`Error serving asset at ${req.path}:`, err);
        res.status(404).send("Asset not found");
      }
    }
  );
});

// Catch-all route for SPA
app.get("*", (req, res) => {
  console.log(`Serving index.html for path: ${req.path}`);
  res.sendFile(
    path.resolve(__dirname, "public", "build", "index.html"),
    (err) => {
      if (err) {
        console.error(`Error serving index.html: ${err}`);
        res.status(500).send("Server error");
      }
    }
  );
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

connectDB();
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
