const express = require("express");
const cadastroRoutes = require("./routes/cadastroRoutes");
const loginRoutes = require("./routes/loginRoutes");

const PORT = process.env.PORT || 8080;

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

app.use("/cadastro", cadastroRoutes);
app.use("/login", loginRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
