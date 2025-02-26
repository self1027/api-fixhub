const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const loginLimiter = require("../middlewares/loginLimiter");
const { generateToken, generateRefreshToken } = require("../config/auth");
const verificarTipoUsuario = require("../middlewares/verifyUserType");

const router = express.Router();
router.use(express.json()); // Adicionando o middleware JSON

// Rota de Login
router.post("/", loginLimiter, async (req, res) => {
    const { username, senha } = req.body;
    try {
        const result = await pool.query(
            "SELECT id, tipo, senha FROM usuarios WHERE username = $1 OR email = $1",
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const user = result.rows[0];

        // Impedir login se o tipo do usuário for 9
        if (user.tipo === 9) {
            return res.status(403).json({ error: "Acesso negado" });
        }

        const senhaValida = await bcrypt.compare(senha, user.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        await pool.query(
            `INSERT INTO tokens (usuario_id, access_token, refresh_token, expiracao_access, expiracao_refresh) 
             VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '7 days')`,
            [user.id, token, refreshToken]
        );

        res.json({ token, refreshToken });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

module.exports = router;
