const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 4000;

// Sirve todos los archivos de presentacion/public/
app.use(express.static(path.join(__dirname, 'public')));

// Raíz → login
app.get('/', (_req, res) => {
    res.redirect('/login.html');
});

app.listen(PORT, () => {
    console.log(`Frontend corriendo en http://localhost:${PORT}`);
});
