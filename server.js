const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

// Configuração do banco de dados usando Cloud SQL Socket
const pool = new Pool({
  user: process.env.DB_USER,                 
  host: `/cloudsql/${process.env.DB_HOST}`,  
  database: process.env.DB_NAME,             
  password: process.env.DB_PASSWORD,         
  port: process.env.DB_PORT || 5432,         
});

app.use(express.json());

app.get("/", async (req, res) => {
  res.json({ message: "🚀 API rodando na Cloud Run!" });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
