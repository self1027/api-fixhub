const express = require("express");
const app = express();
const authRoutes = require("./routes/authRoutes");

const PORT = process.env.PORT || 8080;

app.set("trust proxy", 1);
app.use(express.json());

app.use(authRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
