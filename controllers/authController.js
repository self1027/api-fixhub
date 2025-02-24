const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { generateToken, generateRefreshToken } = require("../utils/tokenUtils");

// Cadastro de usuário
const cadastro = async (req, res) => {
  const { nome, email, senha, telefone } = req.body;

  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE nome = $1 OR email = $2", [nome, email]);

    if (result.rows.length > 0) {
      return res.status(400).json({ error: "Usuário ou e-mail já existe" });
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    await pool.query(
      "INSERT INTO usuarios (nome, email, senha, telefone, tipo) VALUES ($1, $2, $3, $4, 9)",
      [nome, email, senhaCriptografada, telefone]
    );

    res.status(201).json({ message: "Usuário cadastrado com sucesso" });
  } catch (error) {
    console.error("Erro no cadastro:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

// Login de usuário
const login = async (req, res) => {
  const { nome, senha, device_uuid } = req.body;

  try {
    const result = await pool.query("SELECT id, tipo, senha FROM usuarios WHERE nome = $1", [nome]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    await pool.query(
      "INSERT INTO user_tokens (user_id, token, refresh_token, device_uuid, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days') ON CONFLICT (user_id, device_uuid) DO UPDATE SET token = $2, refresh_token = $3, expires_at = NOW() + INTERVAL '7 days'",
      [user.id, token, refreshToken, device_uuid]
    );

    res.json({ token, refreshToken });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

module.exports = { cadastro, login };
