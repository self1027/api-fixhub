const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");

const PORT = process.env.PORT || 8080;
const SECRET_KEY = process.env.SECRET_KEY;
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;

const app = express();
app.set('trust proxy', true);


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
  const { nome, email, senha, tipo } = req.body;

  try {
    // Verifica se o usuário já existe
    const result = await pool.query("SELECT * FROM usuarios WHERE nome = $1 OR email = $2", [nome, email]);

    if (result.rows.length > 0) {
      return res.status(400).json({ error: "Usuário ou e-mail já existe" });
    }

    // Criptografa a senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // Insere o usuário no banco de dados
    await pool.query(
      "INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4)",
      [nome, email, senhaCriptografada, tipo]
    );

    res.status(201).json({ message: "Usuário cadastrado com sucesso" });
  } catch (error) {
    console.error("Erro no cadastro:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Rota de Login
app.post("/login", loginLimiter, async (req, res) => {
  const { nome, senha } = req.body;

  try {
    // Busca o usuário no banco (retorna apenas os dados necessários)
    const result = await pool.query(
      "SELECT id, tipo, senha FROM usuarios WHERE nome = $1",
      [nome]
    );

    // Essa função de login implementa boas práticas de segurança para evitar ataques de enumeração de usuários e
    // força bruta. Mesmo que um invasor tente descobrir usuários válidos ou acerte uma senha fictícia, ele nunca 
    // receberá um token válido, pois o sistema só gera tokens para usuários existentes. Além disso, o uso de um hash fictício
    // impede que o tempo de resposta revele informações sobre a existência de um usuário. 
    // Combinado com um limite de tentativas, esse método torna a autenticação muito mais segura contra ataques.
    const senhaCriptografada = result.rows.length > 0 ? result.rows[0].senha : "$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

    // Compara a senha informada com a senha salva (ou fictícia)
    const senhaValida = await bcrypt.compare(senha, senhaCriptografada);

    // Responde com erro genérico se a senha for inválida ou o usuário não existir
    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = result.rows[0];

    // Gera o Token JWT
    const token = generateToken(user);

    // Gera o Refresh Token
    const refreshToken = generateRefreshToken(user);

    // Retorna os tokens
    res.json({ token, refreshToken });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Rota para renovar o token usando o refresh token
app.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token é necessário" });
  }

  try {
    // Verifica se o refresh token é válido
    jwt.verify(refreshToken, REFRESH_SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Refresh token inválido" });
      }

      // Gera um novo token de acesso
      const token = generateToken(user);
      res.json({ token });
    });
  } catch (error) {
    console.error("Erro no refresh token:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
