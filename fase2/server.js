const express = require('express');

const app = express();
app.disable('x-powered-by');

app.get('/', (req, res) => {
  res.type('text/plain').send('Actividad 3 - Fase 2: imagen escaneada con Trivy\n');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'act3-fase2' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
