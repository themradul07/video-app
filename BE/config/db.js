const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,     // Database name
  process.env.DB_USER,     // DB username
  process.env.DB_PASSWORD, // DB password
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: false, // set to true to log raw SQL queries
  }
);

// Connect and sync DB
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL connected via Sequelize.");

    // Sync models
    await sequelize.sync({ alter: true }); // for dev, use alter; for fresh db use force:true
    console.log("✅ Models synced.");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    process.exit(1); // stop the server
  }
};

module.exports = { sequelize, connectDB };
