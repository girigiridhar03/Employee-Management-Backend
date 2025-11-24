import dotenv from "dotenv";
dotenv.config();
import connectToDB from "./config/DB.config.js";
import app from "./app.js";

connectToDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Server is listening to PORT:${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log(`Connection Failed : ${error}`);
    process.exit(1);
  });
