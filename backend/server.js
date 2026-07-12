
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Roadview IA funcionando");
});

app.post("/lead", (req, res) => {

  console.log(req.body);

  res.json({
    success: true,
    message: "Lead recibido correctamente"
  });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
