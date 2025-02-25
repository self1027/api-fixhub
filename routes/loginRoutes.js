const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const loginLimiter = require("../middlewares/loginLimiter");
const { generateToken, generateRefreshToken } = require("../config/auth");
const verificarTipoUsuario = require("../middlewares/verifyUserType");

// Rota de Login
app.post("/", verificarTipoUsuario ([0, 1, 2, 3]), loginLimiter, async (req, res) => {
    const { nome, senha, device_uuid } = req.body;
    try {
      const result = await pool.query(
        "SELECT id, tipo, senha FROM usuarios WHERE nome = $1",
        [nome]
      );
      const senhaCriptografada = result.rows.length > 0 ? result.rows[0].senha : "$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
      const senhaValida = await bcrypt.compare(senha, senhaCriptografada);
      if (!senhaValida) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      const user = result.rows[0];
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);
      await pool.query(
        `INSERT INTO user_tokens (user_id, token, refresh_token, device_uuid, expires_at) 
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
        [user.id, token, refreshToken, device_uuid]
      );
      res.json({ token, refreshToken });
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
});

  module.exports = router;
  