const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY;
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;

const generateToken = (user) => {
  return jwt.sign({ id: user.id, tipo: user.tipo }, SECRET_KEY, { expiresIn: "1h" });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, tipo: user.tipo }, REFRESH_SECRET_KEY, { expiresIn: "7d" });
};

module.exports = { generateToken, generateRefreshToken };
