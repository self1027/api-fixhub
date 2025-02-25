const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const router = express.Router();

// Rota de Cadastro
router.post("/", async (req, res) => {
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
});

module.exports = router;
