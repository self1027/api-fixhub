const express = require("express");
const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const path = require("path");

const router = express.Router();
const storage = new Storage();
const bucketName = process.env.BUCKET_NAME;
const upload = multer({ storage: multer.memoryStorage() });

// Rota para upload de imagens
router.post("/upload", upload.single("imagem"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    // Nome do arquivo com timestamp para evitar sobrescrita
    const fileName = `${Date.now()}-${path.basename(req.file.originalname)}`;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Salvar a imagem no Cloud Storage
    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    // Tornar a imagem pública
    await file.makePublic();

    // Gerar URL pública
    const imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    res.json({ imageUrl });
  } catch (error) {
    console.error("Erro no upload:", error);
    res.status(500).json({ error: "Erro ao enviar imagem" });
  }
});

module.exports = router;
