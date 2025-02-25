const express = require("express");
const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
require("dotenv").config();

const router = express.Router();
const storage = new Storage();
const bucketName = process.env.BUCKET_NAME;
const bucket = storage.bucket(bucketName);

// Configuração do Multer (Armazena arquivos na memória)
const upload = multer({ storage: multer.memoryStorage() });

// Rota para upload de imagens
router.post("/upload", upload.single("imagem"), async (req, res) => {
  try {
    console.log("Body recebido:", req.body);
    console.log("Arquivo recebido:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    // Gera um nome único para o arquivo (evita sobrescrita)
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

    res.json({ imageUrl });
  } catch (error) {
    console.error("Erro no upload:", error);
    res.status(500).json({ error: "Erro ao enviar imagem" });
  }
});

module.exports = router;
