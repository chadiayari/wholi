const mongoose = require("mongoose");
const Admin = require("../Models/admins.Model");

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.URI || "mongodb://localhost:27017/milkd",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

const createAdmin = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: "mohamed" });

    if (existingAdmin) {
      console.log('Admin user "mohamed" already exists');
      return;
    }

    // Create new admin
    const admin = new Admin({
      username: "mohamed",
      password: "3edccde3!3", // In production, you should hash this password
    });

    await admin.save();
    console.log('Admin user "mohamed" created successfully');
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed");
  }
};

// Run the script
if (require.main === module) {
  createAdmin();
}

module.exports = createAdmin;
