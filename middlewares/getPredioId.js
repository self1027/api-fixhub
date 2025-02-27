const jwt = require("jsonwebtoken");
const pool = require("../config/db");
require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY;

const getPredioId = async (req, res, next) => {
  try {
    // Captura o token do cabeçalho
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    // Decodifica o token para obter o ID do usuário
    const decoded = jwt.verify(token, SECRET_KEY);
    const sindico_id = decoded.id;

    // Verifica se o usuário é síndico (tipo 1)
    if (decoded.tipo !== 1) {
      return res.status(403).json({ error: "Apenas síndicos podem cadastrar categorias." });
    }

    // Buscar predio_id do síndico na tabela predios
    const result = await pool.query("SELECT id FROM predios WHERE sindico_id = $1", [sindico_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Prédio não encontrado para o síndico." });
    }

    req.predio_id = result.rows[0].id; // Adiciona predio_id ao request
    next();
  } catch (error) {
    console.error("Erro ao obter predio_id:", error.message);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ error: "Token inválido" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }

    res.status(500).json({ error: "Erro interno no servidor." });
  }
};

module.exports = getPredioId;
