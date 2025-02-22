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
  res.json({ message: "🚀 API rodando na Cloud Runnnnn!" });
});

// Criar usuário
app.post("/usuarios", async (req, res) => {
  const { nome, email, senha, tipo } = req.body;
  if (!nome || !email || !senha || tipo === undefined) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    const id = uuidv4();
    const result = await pool.query(
      "INSERT INTO usuarios (id, nome, email, senha, tipo) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [id, nome, email, senha, tipo]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);  // Log detalhado do erro
    res.status(500).json({ error: "Erro ao criar usuário", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
