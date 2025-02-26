const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verificarTipoUsuario = (tiposPermitidos) => {
  return (req, res, next) => {
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
  };
};

module.exports = verificarTipoUsuario;
