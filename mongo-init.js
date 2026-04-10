// mongo-init.js — Crea el usuario de la app al primer arranque
// Este archivo se ejecuta solo la primera vez que el volumen está vacío

db = db.getSiblingDB('einsmart');

db.createUser({
  user: 'einsmart_app',
  pwd: process.env.MONGO_APP_PASSWORD || 'apppass2024',
  roles: [{ role: 'readWrite', db: 'einsmart' }]
});

print('✅ Usuario einsmart_app creado en base de datos einsmart');
