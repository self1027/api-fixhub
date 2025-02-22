require("dotenv").config();
const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

app.use(express.json());
app.get("/", (req, res) => {
  res.json({ message: "API rodando na Cloud Run!!!" });
});
