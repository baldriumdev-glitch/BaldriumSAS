require('dotenv').config();
const app = require('./presentacion/app');

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});