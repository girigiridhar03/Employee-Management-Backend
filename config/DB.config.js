import mongoose from "mongoose";

const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log("Database connected successfully...");
  } catch (error) {
    console.log("Database connection failed...", error);
    process.exit(1);
  }
};

export default connectToDB;
