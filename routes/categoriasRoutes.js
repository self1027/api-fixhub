const express = require("express");
const pool = require("../config/db");
const verificarTipoUsuario = require("../middlewares/verifyUserType");
const getPredioId = require("../middlewares/getPredioId");

const router = express.Router();

// Rota para cadastro de categorias de manutenção (apenas síndicos)
router.post("/", verificarTipoUsuario(1), getPredioId, async (req, res) => {
  try {
    const { nome } = req.body;
    const { predio_id } = req;

    if (!nome) {
      return res.status(400).json({ error: "O nome da categoria é obrigatório." });
    }

    // Inserir a nova categoria
    await pool.query("INSERT INTO categorias_manutencao (nome, predio_id) VALUES ($1, $2)", [nome, predio_id]);

    res.status(201).json({ message: "Categoria cadastrada com sucesso!" });
  } catch (error) {
    console.error("Erro ao cadastrar categoria:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

module.exports = router;
