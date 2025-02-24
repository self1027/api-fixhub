const rateLimit = require("express-rate-limit");

// Limite de tentativas de login para evitar brute force
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo de tentativas antes de bloquear
    message: "Muitas tentativas de login. Tente novamente mais tarde.",
  });

module.exports = loginLimiter;
