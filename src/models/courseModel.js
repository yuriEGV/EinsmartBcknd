/*const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    teacherId: { type: mongoose.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);


*/

import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  name: {
    type: String,
    required: [true, 'El nombre del curso es obligatorio'],
    trim: true
  },
  level: {
    type: String, // e.g., "1° básico", "Pre-kinder", etc.
    required: true,
    trim: true
  },
  letter: {
    type: String, // e.g., "A", "B", "C"
    required: true,
    uppercase: true,
    trim: true
  },
  code: {
    type: String,
    default: function () {
      // Genera un código único tipo "COURSE-AB1234"
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `COURSE-${random}`;
    },
    unique: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  teacherId: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: true
  },
  careerId: {
    type: mongoose.Types.ObjectId,
    ref: 'Career',
    default: null
  }
}, {
  timestamps: true
});

// Índice compuesto para evitar duplicados por tenant y nombre
courseSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model('Course', courseSchema);
