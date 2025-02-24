const express = require("express");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");

const pool = require("./config/db");
const { generateToken, generateRefreshToken } = require("./config/auth");
const verificarTipoUsuario = require("./middlewares/verifyUserType");

const PORT = process.env.PORT || 8080;
const SECRET_KEY = process.env.SECRET_KEY;
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;

const app = express();
app.set("trust proxy", 1);

app.use(express.json());

// Limite de tentativas de login para evitar brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo de tentativas antes de bloquear
  message: "Muitas tentativas de login. Tente novamente mais tarde.",
});

app.post("/cadastro", async (req, res) => {
  const { nome, email, senha, telefone } = req.body;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE nome = $1 OR email = $2", [nome, email]);
    if (result.rows.length > 0) {
      return res.status(400).json({ error: "Usuário ou e-mail já existe" });
    }
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    const userResult = await pool.query(
      "INSERT INTO usuarios (nome, email, senha, telefone, tipo) VALUES ($1, $2, $3, $4, 9) RETURNING id",
      [nome, email, senhaCriptografada, telefone]
    );
    res.status(201).json({ message: "Usuário cadastrado com sucesso" });
  } catch (error) {
    console.error("Erro no cadastro:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Rota de Login
app.post("/login", verificarTipoUsuario ([0, 1, 2, 3]), loginLimiter, async (req, res) => {
  const { nome, senha, device_uuid } = req.body;
  try {
    const result = await pool.query(
      "SELECT id, tipo, senha FROM usuarios WHERE nome = $1",
      [nome]
    );
    const senhaCriptografada = result.rows.length > 0 ? result.rows[0].senha : "$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    const senhaValida = await bcrypt.compare(senha, senhaCriptografada);
    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }
    const user = result.rows[0];
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    await pool.query(
      `INSERT INTO user_tokens (user_id, token, refresh_token, device_uuid, expires_at) 
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [user.id, token, refreshToken, device_uuid]
    );
    res.json({ token, refreshToken });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
