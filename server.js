require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Certifique-se de definir esta variável no ambiente
  ssl: {
    rejectUnauthorized: false, // Necessário se estiver usando o PostgreSQL na nuvem (ex: Heroku, Render)
  },
});

app.use(express.json());

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios");
    res.json({
      message: "🚀 API rodando na Cloud Runnnnnnnnn!",
      usuarios: result.rows, // Retorna os usuários junto com a mensagem
    });
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
