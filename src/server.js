const express = require("express");
const authRoutes = require("./routes/authRoutes");

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

app.use("/", authRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});