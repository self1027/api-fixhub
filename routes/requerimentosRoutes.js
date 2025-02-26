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

// Configuração do Multer para armazenar múltiplos arquivos na memória
const upload = multer({ storage: multer.memoryStorage() });

// Rota para criação de requisições de manutenção
router.post( "/", verificarTipoUsuario([1, 2, 3]), // Permitir que moradores também criem requisições
  upload.array("imagens", 5), // Permitir até 5 imagens por requisição
  async (req, res) => {
    try {
      const {
        bloco_id,
        descricao,
        prioridade,
        categoria_id,
      } = req.body;
      const sindico_id = req.user.tipo === 1 ? req.user.id : null;
      const responsavel_id = req.user.tipo === 2 ? req.user.id : null;
      const morador_id = req.user.tipo === 3 ? req.user.id : null;

      if (!bloco_id || !descricao || !prioridade || !categoria_id) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
      }

      // Criar a requisição de manutenção
      const result = await pool.query(
        `INSERT INTO manutencoes 
        (bloco_id, descricao, prioridade, status, data_solicitacao, sindico_id, responsavel_id, morador_id, categoria_id) 
        VALUES ($1, $2, $3, 'Pendente', NOW(), $4, $5, $6, $7) RETURNING id`,
        [bloco_id, descricao, prioridade, sindico_id, responsavel_id, morador_id, categoria_id]
      );

      const manutencao_id = result.rows[0].id;

      // Salvar múltiplas imagens, se houver
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileName = `${Date.now()}-${path.basename(file.originalname)}`;
          const gcsFile = bucket.file(fileName);
          await gcsFile.save(file.buffer, {
            metadata: { contentType: file.mimetype },
          });
          await gcsFile.makePublic();
          const imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

          await pool.query(
            `INSERT INTO imagem_requisicoes (manutencao_id, url_imagem) VALUES ($1, $2)`,
            [manutencao_id, imageUrl]
          );
        }
      }

      res.status(201).json({ message: "Requisição criada com sucesso!", manutencao_id });
    } catch (error) {
      console.error("Erro ao criar requisição:", error);
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  }
);

module.exports = router;
