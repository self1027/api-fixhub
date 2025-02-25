// middlewares/verifyUserType.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verificarTipoUsuario = (tiposPermitidos) => {
  return (req, res, next) => {
    // Caso o usuário esteja tentando fazer login
    if (req.path === "/login") {
      const { nome } = req.body;
      if (!nome) {
        return res.status(400).json({ error: "Nome de usuário não fornecido" });
      }

      pool.query("SELECT tipo FROM usuarios WHERE nome = $1", [nome])
        .then(result => {
          if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado" });
          }
          const tipo = result.rows[0].tipo;
          if (!tiposPermitidos.includes(tipo)) {
            return res.status(403).json({ error: "Ação não permitida para este tipo de usuário" });
          }
          next();
        })
        .catch(error => {
          console.error("Erro na consulta de tipo de usuário:", error);
          return res.status(500).json({ error: "Erro interno no servidor" });
        });
    } else {
      // Se não for login, verificamos o token
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Token não fornecido" });
      }
      
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.user = decoded;
        const { tipo } = req.user;
        if (!tiposPermitidos.includes(tipo)) {
          return res.status(403).json({ error: "Ação não permitida para este tipo de usuário" });
        }
        next();
      } catch (error) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
    }
  };
};

module.exports = verificarTipoUsuario;
