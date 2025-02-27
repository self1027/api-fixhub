const pool = require("../config/db");

const getPredioId = async (req, res, next) => {
  try {
    if (req.user.tipo !== 1) {
      return res.status(403).json({ error: "Apenas síndicos podem cadastrar categorias." });
    }

    const { id: sindico_id } = req.user;

    // Buscar predio_id do síndico na tabela predios
    const result = await pool.query("SELECT id FROM predios WHERE sindico_id = $1", [sindico_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Prédio não encontrado para o síndico." });
    }

    req.predio_id = result.rows[0].id; // Adiciona predio_id ao request
    next();
  } catch (error) {
    console.error("Erro ao obter predio_id:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
};

module.exports = getPredioId;
