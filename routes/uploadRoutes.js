const express = require("express");
const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
require("dotenv").config();

const router = express.Router();

// Configuração do Google Cloud Storage
const storage = new Storage();
const bucketName = process.env.BUCKET_NAME;
const bucket = storage.bucket(bucketName);

// Configuração do Multer para armazenar arquivos na memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB por arquivo
});

// Rota para upload de imagens
router.post("/upload", upload.single("imagem"), async (req, res) => {
  try {
    console.log("Body recebido:", req.body);
    console.log("Arquivo recebido:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    // Gera um nome único para o arquivo
    const fileName = `${Date.now()}-${path.basename(req.file.originalname)}`;
    const file = bucket.file(fileName);

    // Salva a imagem no Cloud Storage
    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    // Torna a imagem pública
    await file.makePublic();

    // URL pública da imagem
    const imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    res.json({ message: "Upload realizado com sucesso!", imageUrl });
  } catch (error) {
    console.error("Erro no upload:", error);
    res.status(500).json({ error: "Erro ao enviar imagem." });
  }
});

module.exports = router;
