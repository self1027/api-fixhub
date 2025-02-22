const express = require("express");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

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
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
});

// Listar todos os usuários
app.get("/usuarios", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// Buscar usuário por ID
app.get("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// Atualizar usuário
app.put("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, tipo } = req.body;
  try {
    const result = await pool.query(
      "UPDATE usuarios SET nome = $1, email = $2, senha = $3, tipo = $4 WHERE id = $5 RETURNING *",
      [nome, email, senha, tipo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
});

// Deletar usuário
app.delete("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM usuarios WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    res.json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao deletar usuário" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
