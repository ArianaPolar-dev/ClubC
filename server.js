import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 3000;

// Para servir archivos estáticos (index.html, main.js, etc.)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(bodyParser.json());

// Inicializar/abrir la base de datos SQLite
let db;
(async () => {
  db = await open({
    filename: "./db.sqlite",
    driver: sqlite3.Database
  });

  // Crear tablas si no existen
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT UNIQUE,
      password TEXT,
      correo TEXT,
      rol TEXT
    );
    CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      cedula TEXT,
      correo TEXT,
      telefono TEXT,
      salon TEXT,
      fecha TEXT,
      hora TEXT,
      servicios TEXT,
      comentarios TEXT,
      estado TEXT DEFAULT 'En proceso'
    );
  `);
})();

// --- Rutas API --- //

// Registro de usuario
app.post("/api/registro", async (req, res) => {
  const { usuario, password, correo, rol } = req.body;
  try {
    await db.run(
      "INSERT INTO usuarios (usuario, password, correo, rol) VALUES (?, ?, ?, ?)",
      [usuario, password, correo, rol]
    );
    res.json({ success: true, message: "Usuario registrado" });
  } catch (err) {
    res.status(400).json({ success: false, message: "Usuario ya existe" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { usuario, password } = req.body;
  const user = await db.get("SELECT * FROM usuarios WHERE usuario = ? AND password = ?", [usuario, password]);
  if (user) {
    // En producción, deberías usar JWT o sesiones seguras
    res.json({ success: true, user: { usuario: user.usuario, rol: user.rol, correo: user.correo } });
  } else {
    res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos" });
  }
});

// Crear reserva
app.post("/api/reservas", async (req, res) => {
  const { nombre, cedula, correo, telefono, salon, fecha, hora, servicios, comentarios } = req.body;
  try {
    await db.run(
      "INSERT INTO reservas (nombre, cedula, correo, telefono, salon, fecha, hora, servicios, comentarios, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [nombre, cedula, correo, telefono, salon, fecha, hora, servicios.join(','), comentarios, "En proceso"]
    );
    res.json({ success: true, message: "Reserva registrada" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error al crear la reserva" });
  }
});

// Consultar reservas (filtradas)
app.get("/api/reservas", async (req, res) => {
  const { salon, fecha } = req.query;
  let query = "SELECT * FROM reservas WHERE 1=1";
  let params = [];
  if (salon) { query += " AND salon = ?"; params.push(salon); }
  if (fecha) { query += " AND fecha = ?"; params.push(fecha); }
  
  try {
    const lista = await db.all(query, params);
    res.json(lista);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error al consultar reservas" });
  }
});

// Panel admin: ver todas las reservas
app.get("/api/admin/reservas", async (req, res) => {
  try {
    const lista = await db.all("SELECT * FROM reservas");
    res.json(lista);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error al obtener reservas" });
  }
});

// Panel admin: obtener detalles de una reserva específica
app.get("/api/admin/reserva/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const reserva = await db.get("SELECT * FROM reservas WHERE id = ?", [id]);
    if (reserva) {
      res.json(reserva);
    } else {
      res.status(404).json({ success: false, message: "Reserva no encontrada" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Error al obtener detalles de la reserva" });
  }
});

// Panel admin: cambiar estado de reserva
app.post("/api/admin/estado", async (req, res) => {
  const { id, estado } = req.body;
  try {
    await db.run("UPDATE reservas SET estado = ? WHERE id = ?", [estado, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error al cambiar estado" });
  }
});

// Panel admin: actualizar reserva
app.post("/api/admin/actualizar", async (req, res) => {
  const { id, ...data } = req.body;
  
  try {
    // Construir la query dinámicamente basada en los campos proporcionados
    const fields = [];
    const values = [];
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No hay campos para actualizar" });
    }
    
    values.push(id); // Agregar el ID al final para el WHERE
    
    const query = `UPDATE reservas SET ${fields.join(', ')} WHERE id = ?`;
    await db.run(query, values);
    
    res.json({ success: true, message: "Reserva actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error al actualizar la reserva" });
  }
});

// Panel admin: ver usuarios
app.get("/api/admin/usuarios", async (req, res) => {
  try {
    const lista = await db.all("SELECT usuario, correo, rol FROM usuarios");
    res.json(lista);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error al obtener usuarios" });
  }
});

// --- Servidor iniciado --- //
app.listen(port, () => {
  console.log(`Club Canaima backend escuchando en http://localhost:${port}`);
});