const express = require("express");
const { cadastro, login } = require("../controllers/authController");
const verificarTipoUsuario = require("../middlewares/authMiddleware");
const loginLimiter = require("../src/utils/rateLimiter");
const router = express.Router();

router.post("/cadastro", cadastro);
router.post("/login", verificarTipoUsuario([0, 1, 2, 3]), loginLimiter, login);

module.exports = router;