const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign({ id: user.id, tipo: user.tipo }, process.env.SECRET_KEY, { expiresIn: "1h" });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, tipo: user.tipo }, process.env.REFRESH_SECRET_KEY, { expiresIn: "7d" });
};

module.exports = { generateToken, generateRefreshToken };