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
    const result = await pool.query(
      "INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING *",
      [nome, email, senha, tipo]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);  // Log detalhado do erro
    res.status(500).json({ error: "Erro ao criar usuário", details: error.message });
  }
});

// Buscar usuários por nome
app.get("/usuarios/nome", async (req, res) => {
  const { nome } = req.query;  // Pega o nome da query string

  if (!nome) {
    return res.status(400).json({ error: "O nome é obrigatório" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE nome ILIKE $1",  // ILIKE é usado para busca case-insensitive
      [`%${nome}%`]  // "%" faz com que a busca seja parcial
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Nenhum usuário encontrado" });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuários por nome:', error);
    res.status(500).json({ error: "Erro ao buscar usuários", details: error.message });
  }
});

// Buscar usuário por ID
app.get("/usuarios/id", async (req, res) => {
  const { id } = req.query;  // Pega o ID da query string

  if (!id) {
    return res.status(400).json({ error: "O ID é obrigatório" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE id = $1",  // Consulta o usuário pelo ID
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error);
    res.status(500).json({ error: "Erro ao buscar usuário", details: error.message });
  }
});

// Buscar usuário por email
app.get("/usuarios/email", async (req, res) => {
  const { email } = req.query;  // Pega o email da query string

  if (!email) {
    return res.status(400).json({ error: "O email é obrigatório" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",  // Consulta o usuário pelo email
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    res.status(500).json({ error: "Erro ao buscar usuário", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
