require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
app.use('/auth', require('./routes/auth'));
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));
