const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const router = express.Router();
router.use(express.json());

// Rota de Cadastro
router.post("/", async (req, res) => {
    const { nome, username, email, senha, telefone } = req.body;
    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE username = $1 OR email = $2", [username, email]);

        if (result.rows.length > 0) {
            return res.status(400).json({ error: "Nome de usuário ou e-mail já existe" });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        await pool.query(
            "INSERT INTO usuarios (nome, username, email, senha, telefone, tipo) VALUES ($1, $2, $3, $4, $5, 9)",
            [nome, username, email, senhaCriptografada, telefone, tipo]
        );

        res.status(201).json({ message: "Usuário cadastrado com sucesso" });
    } catch (error) {
        console.error("Erro no cadastro:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

module.exports = router;
