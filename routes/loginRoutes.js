const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const loginLimiter = require("../middlewares/loginLimiter");
const { generateToken, generateRefreshToken } = require("../config/auth");

const router = express.Router();
router.use(express.json());

// Login Route
router.post("/", loginLimiter, async (req, res) => {
    const { username, senha } = req.body; // Keeping 'senha' as per DB structure

    try {
        const result = await pool.query(
            "SELECT id, tipo, senha, username, nome FROM usuarios WHERE username = $1",
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const user = result.rows[0];

        // Prevent login if user type is 9
        if (user.tipo === 9) {
            return res.status(403).json({ error: "Acesso negado" });
        }

        // Validate password
        const senhaValida = await bcrypt.compare(senha, user.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        // Generate tokens
        const token = generateToken({ id: user.id, tipo: user.tipo });
        const refreshToken = generateRefreshToken({ id: user.id });

        // Store tokens in the database
        await pool.query(
            `INSERT INTO tokens (usuario_id, access_token, refresh_token, expiracao_access, expiracao_refresh) 
             VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '7 days')`,
            [user.id, token, refreshToken]
        );

        res.json({ 
            token, 
            refreshToken, 
            username: user.username, 
            fullname: user.nome // Keeping 'nome' from DB
        });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

module.exports = router;
