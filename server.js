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

//Verifica o Tipo do Usuário (Admin, Gerente, Contribuinte ou Morador)
const verificarTipoUsuario = (tiposPermitidos) => {
  return (req, res, next) => {
    // Se for a rota de login, não verificamos o tipo pelo token
    if (req.path === "/login") {
      const { nome } = req.body; // Pegando o nome do usuário fornecido na requisição

      // Verifica se o nome foi fornecido
      if (!nome) {
        return res.status(400).json({ error: "Nome de usuário não fornecido" });
      }

      // Consulta o banco de dados para verificar o tipo do usuário
      pool.query("SELECT tipo FROM usuarios WHERE nome = $1", [nome])
        .then(result => {
          if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado" });
          }

          const tipo = result.rows[0].tipo;

          // Verifica se o tipo do usuário está entre os tipos permitidos
          if (!tiposPermitidos.includes(tipo)) {
            return res.status(403).json({ error: "Ação não permitida para este tipo de usuário" });
          }

          // Se o tipo for válido, permite a continuação
          next();
        })
        .catch(error => {
          console.error("Erro na consulta de tipo de usuário:", error);
          return res.status(500).json({ error: "Erro interno no servidor" });
        });

    } else {
      // Se não for a rota de login, o comportamento continua como antes
      const token = req.headers.authorization?.split(" ")[1]; // Extraí o token do cabeçalho

      if (!token) {
        return res.status(401).json({ error: "Token não fornecido" });
      }

      try {
        // Decodifica o token
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Salva as informações do usuário decodificado na requisição

        // Verifica se o tipo do usuário está entre os tipos permitidos
        const { tipo } = req.user;
        if (!tiposPermitidos.includes(tipo)) {
          return res.status(403).json({ error: "Ação não permitida para este tipo de usuário" });
        }

        next(); // Se autorizado, segue para a próxima etapa
      } catch (error) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
    }
  };
};


// Rota de Cadastro
app.post("/cadastro", async (req, res) => {
  const { nome, email, senha, telefone, device_uuid } = req.body; // Recebendo telefone e device_uuid

  // Verifica se o device_uuid foi fornecido
  if (!device_uuid) {
    return res.status(400).json({ error: "device_uuid é necessário para o cadastro." });
  }

  try {
    // Verifica se o usuário já existe
    const result = await pool.query("SELECT * FROM usuarios WHERE nome = $1 OR email = $2", [nome, email]);

    if (result.rows.length > 0) {
      return res.status(400).json({ error: "Usuário ou e-mail já existe" });
    }

    // Criptografa a senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // Insere o usuário no banco de dados, sempre com tipo 9
    const userResult = await pool.query(
      "INSERT INTO usuarios (nome, email, senha, telefone, tipo) VALUES ($1, $2, $3, $4, 9) RETURNING id", // tipo 9 fixo
      [nome, email, senhaCriptografada, telefone]
    );
    
    const userId = userResult.rows[0].id;

    // Cria o token e o refresh token para o dispositivo específico
    const token = generateToken({ id: userId, tipo: 9 }); // tipo 9 fixo
    const refreshToken = generateRefreshToken({ id: userId, tipo: 9 }); // tipo 9 fixo

    // Verifica se o usuário já tem um token associado ao device_uuid
    const tokenResult = await pool.query(
      "SELECT * FROM user_tokens WHERE user_id = $1 AND device_uuid = $2",
      [userId, device_uuid]
    );

    // Se não houver token, cria um novo
    if (tokenResult.rows.length === 0) {
      await pool.query(
        "INSERT INTO user_tokens (user_id, token, refresh_token, device_uuid, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')",
        [userId, token, refreshToken, device_uuid]
      );
    }

    // Retorna os tokens
    res.status(201).json({ message: "Usuário cadastrado com sucesso", token, refreshToken });
  } catch (error) {
    console.error("Erro no cadastro:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Rota de Login
app.post("/login", verificarTipoUsuario([0, 1, 2, 3]), loginLimiter, async (req, res) => {
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

    // Verifica se já existe um token para o dispositivo com device_uuid
    const tokenResult = await pool.query(
      "SELECT * FROM user_tokens WHERE user_id = $1 AND device_uuid = $2",
      [user.id, device_uuid]
    );

    if (tokenResult.rows.length > 0) {
      // Se um token ativo existir, desativa o token anterior (ou remova-o)
      await pool.query(
        "UPDATE user_tokens SET expires_at = NOW() WHERE user_id = $1 AND device_uuid = $2",
        [user.id, device_uuid]
      );
    }

    // Gera o Token JWT
    const token = generateToken(user);

    // Gera o Refresh Token
    const refreshToken = generateRefreshToken(user);

    // Cria ou atualiza o token para o dispositivo específico
    await pool.query(
      "INSERT INTO user_tokens (user_id, token, refresh_token, device_uuid, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days') ON CONFLICT (user_id, device_uuid) DO UPDATE SET token = $2, refresh_token = $3, expires_at = NOW() + INTERVAL '7 days'",
      [user.id, token, refreshToken, device_uuid]
    );

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
