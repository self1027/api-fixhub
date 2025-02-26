const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const router = express.Router();
router.use(express.json());

// Rota de Cadastro
router.post("/", async (req, res) => {
    const { nome, username, email, senha, telefone, predio_nome, complemento } = req.body;

    try {
        // Verifica se o prédio existe
        const predioResult = await pool.query("SELECT id FROM predios WHERE nome = $1", [predio_nome]);

        if (predioResult.rows.length === 0) {
            return res.status(400).json({ error: "Nome de prédio inválido" });
        }

        const predio_id = predioResult.rows[0].id;

        // Verifica se o usuário já existe
        const userExists = await pool.query("SELECT * FROM usuarios WHERE username = $1 OR email = $2", [username, email]);

        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "Nome de usuário ou e-mail já existe" });
        }

        // Criptografa a senha
        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // Insere o usuário na tabela usuarios
        const userInsert = await pool.query(
            "INSERT INTO usuarios (nome, username, email, senha, telefone, tipo) VALUES ($1, $2, $3, $4, $5, 9) RETURNING id",
            [nome, username, email, senhaCriptografada, telefone]
        );

        const usuario_id = userInsert.rows[0].id;

        // Insere o endereço associado ao usuário
        await pool.query(
            "INSERT INTO enderecos (usuario_id, predio_id, descricao) VALUES ($1, $2, $3)",
            [usuario_id, predio_id, complemento]
        );

        res.status(201).json({ message: "Usuário cadastrado com sucesso" });

    } catch (error) {
        console.error("Erro no cadastro:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

module.exports = router;
