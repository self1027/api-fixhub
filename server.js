const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");

const PORT = process.env.PORT || 8080;
const SECRET_KEY = process.env.SECRET_KEY;
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;

const app = express();
app.set("trust proxy", 1);

// Configuração do banco
const pool = new Pool({
  user: process.env.DB_USER,
  host: `/cloudsql/${process.env.DB_HOST}`,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

app.use(express.json());

// Limite de tentativas de login para evitar brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo de tentativas antes de bloquear
  message: "Muitas tentativas de login. Tente novamente mais tarde.",
});

// Função para gerar JWT
const generateToken = (user) => {
  return jwt.sign({ id: user.id, tipo: user.tipo }, SECRET_KEY, { expiresIn: "1h" });
};

// Função para gerar Refresh Token
const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, tipo: user.tipo }, REFRESH_SECRET_KEY, { expiresIn: "7d" }); // Expiração de 7 dias para o refresh token
};

// Rota de Cadastro
app.post("/cadastro", async (req, res) => {
  const { nome, email, senha, tipo, device_uuid } = req.body; // Recebendo device_uuid

  try {
    // Verifica se o usuário já existe
    const result = await pool.query("SELECT * FROM usuarios WHERE nome = $1 OR email = $2", [nome, email]);

    if (result.rows.length > 0) {
      return res.status(400).json({ error: "Usuário ou e-mail já existe" });
    }

    // Criptografa a senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // Insere o usuário no banco de dados
    const userResult = await pool.query(
      "INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id",
      [nome, email, senhaCriptografada, tipo]
    );
    
    const userId = userResult.rows[0].id;

    // Insere o token diretamente, sem a necessidade de tabela de dispositivos separada
    if (device_uuid) {
      // Cria o token e o refresh token para o dispositivo específico
      const token = generateToken({ id: userId, tipo });
      const refreshToken = generateRefreshToken({ id: userId, tipo });

      await pool.query(
        "INSERT INTO user_tokens (user_id, token, refresh_token, device_uuid, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')",
        [userId, token, refreshToken, device_uuid]
      );

      res.status(201).json({ message: "Usuário cadastrado com sucesso", token, refreshToken });
    } else {
      res.status(400).json({ error: "device_uuid é necessário para o cadastro." });
    }

  } catch (error) {
    console.error("Erro no cadastro:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Rota de Login
app.post("/login", loginLimiter, async (req, res) => {
  const { nome, senha, device_uuid } = req.body; // Recebendo device_uuid

  try {
    // Busca o usuário no banco (retorna apenas os dados necessários)
    const result = await pool.query(
      "SELECT id, tipo, senha FROM usuarios WHERE nome = $1",
      [nome]
    );

    const senhaCriptografada = result.rows.length > 0 ? result.rows[0].senha : "$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

    // Compara a senha informada com a senha salva
    const senhaValida = await bcrypt.compare(senha, senhaCriptografada);

    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = result.rows[0];

    // Gera o Token JWT
    const token = generateToken(user);

    // Gera o Refresh Token
    const refreshToken = generateRefreshToken(user);

    // Verifica se já existe um token para o dispositivo com device_uuid
    const tokenResult = await pool.query(
      "SELECT * FROM user_tokens WHERE user_id = $1 AND device_uuid = $2",
      [user.id, device_uuid]
    );

    if (tokenResult.rows.length === 0) {
      // Se não houver token, cria um novo
      await pool.query(
        "INSERT INTO user_tokens (user_id, token, refresh_token, device_uuid, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')",
        [user.id, token, refreshToken, device_uuid]
      );
    }

    // Retorna os tokens
    res.json({ token, refreshToken });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
