const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const loginLimiter = require("../middlewares/loginLimiter");
const { generateToken, generateRefreshToken } = require("../config/auth");

const router = express.Router();
router.use(express.json());

// Login Route
router.post("/", loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const result = await pool.query(
            `SELECT id, tipo, senha, username, nome, email, telefone, data_criacao 
             FROM usuarios WHERE username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const user = result.rows[0];

        // Impedir login se o tipo do usuário for 9 (bloqueado)
        if (user.tipo === 9) {
            return res.status(403).json({ error: "Acesso negado" });
        }

        // Validar senha
        const senhaValida = await bcrypt.compare(password, user.senha);
        if (!senhaValida) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        // Gerar tokens
        const token = generateToken({ id: user.id, tipo: user.tipo });
        const refreshToken = generateRefreshToken({ id: user.id });

        // Armazenar tokens no banco de dados
        await pool.query(
            `INSERT INTO tokens (usuario_id, access_token, refresh_token, expiracao_access, expiracao_refresh) 
             VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '7 days')`,
            [user.id, token, refreshToken]
        );

        res.json({ 
            token, 
            refreshToken, 
            username: user.username, 
            fullname: user.nome,
            email: user.email,
            tipo: user.tipo,
            telefone: user.telefone,
            dataCriacao: user.data_criacao
        });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

module.exports = router;
