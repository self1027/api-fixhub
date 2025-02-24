const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const SECRET_KEY = process.env.SECRET_KEY;

// Middleware para verificar o tipo de usuário
const verificarTipoUsuario = (tiposPermitidos) => {
  return async (req, res, next) => {
    if (req.path === "/login") {
      const { nome } = req.body;

      if (!nome) {
        return res.status(400).json({ error: "Nome de usuário não fornecido" });
      }

      try {
        const result = await pool.query("SELECT tipo FROM usuarios WHERE nome = $1", [nome]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: "Usuário não encontrado" });
        }

        const tipo = result.rows[0].tipo;
        if (!tiposPermitidos.includes(tipo)) {
          return res.status(403).json({ error: "Ação não permitida" });
        }

        next();
      } catch (error) {
        console.error("Erro ao verificar tipo de usuário:", error);
        return res.status(500).json({ error: "Erro interno no servidor" });
      }
    } else {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({ error: "Token não fornecido" });
      }

      try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        if (!tiposPermitidos.includes(req.user.tipo)) {
          return res.status(403).json({ error: "Ação não permitida" });
        }

        next();
      } catch (error) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
    }
  };
};

module.exports = { verificarTipoUsuario };
