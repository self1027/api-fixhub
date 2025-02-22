# Usa a versão mais recente do Node.js LTS como base
FROM node:18

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências primeiro (para otimizar cache)
COPY package*.json ./ 

# Instala as dependências
RUN npm install --omit=dev

# Copia todo o código da API para dentro do container
COPY . . 

# Expõe a porta 8080 para a API
EXPOSE 8080

# Comando para iniciar a API
CMD ["node", "server.js"]
