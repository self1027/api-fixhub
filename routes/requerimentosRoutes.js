const express = require("express");
const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const pool = require("../config/db");
const verificarTipoUsuario = require("../middlewares/verifyUserType");
const path = require("path");
require("dotenv").config();

const router = express.Router();
const storage = new Storage();
const bucketName = process.env.BUCKET_NAME;
const bucket = storage.bucket(bucketName);

// Configuração do Multer para armazenar arquivos na memória
const upload = multer({ storage: multer.memoryStorage() });

// Rota para criação de requerimentos de manutenção
router.post(
  "/",
  verificarTipoUsuario([0, 1, 2, 3]),
  upload.single("imagem"),
  async (req, res) => {
    try {
      const {
        predio_id,
        descricao,
        prioridade,
        sindico_id,
        categoria_id,
      } = req.body;
      const usuario_id = req.user.id; // Obtendo do token

      if (!predio_id || !descricao || !prioridade || !sindico_id || !categoria_id) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
      }

      let imageUrl = null;
      if (req.file) {
        const fileName = `${Date.now()}-${path.basename(req.file.originalname)}`;
        const file = bucket.file(fileName);
        await file.save(req.file.buffer, {
          metadata: { contentType: req.file.mimetype },
        });
        await file.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
      }

      const result = await pool.query(
        `INSERT INTO requisicoes 
        (predio_id, descricao, prioridade, status, data_solicitacao, sindico_id, categoria_id, imagem) 
        VALUES ($1, $2, $3, 'Pendente', NOW(), $4, $5, $6) RETURNING *`,
        [predio_id, descricao, prioridade, sindico_id, categoria_id, imageUrl]
      );

      res.status(201).json({ message: "Requerimento criado com sucesso!", requerimento: result.rows[0] });
    } catch (error) {
      console.error("Erro ao criar requerimento:", error);
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  }
);

module.exports = router;
