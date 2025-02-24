const express = require("express");
const { cadastro, login } = require("../controllers/authController");
const { verificarTipoUsuario } = require("../middlewares/authMiddleware");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: "Muitas tentativas de login. Tente novamente mais tarde.",
});

router.post("/cadastro", cadastro);
router.post("/login", loginLimiter, verificarTipoUsuario([0, 1, 2, 3]), login);

module.exports = router;
