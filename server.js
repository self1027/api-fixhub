const express = require("express");
const cadastroRoutes = require("./routes/cadastroRoutes");
const loginRoutes = require("./routes/loginRoutes");
const requerimentoRoutes = require("./routes/requerimentosRoutes");
const categoriasRoutes = require("./routes/categoriasRoutes")


const PORT = process.env.PORT || 8080;

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/cadastro", cadastroRoutes);
app.use("/login", loginRoutes);
app.use("/requerimentos", requerimentoRoutes);
app.use("/categorias", categoriasRoutes);


app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
