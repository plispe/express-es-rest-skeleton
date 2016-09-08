import express from 'express';

const { PORT = 3000 } = process.env;
const app = express();

app.get('/', (req, res) => {
  res.json({});
});

app.listen(PORT);
