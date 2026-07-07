// models/reportModel.js
import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  type: {
    type: String,
    required: true
  },

  format: {
    type: String,
    required: true
  },

  filters: {
    type: Object,
    default: {}
  },

  status: {
    type: String,
    default: 'pending'
  }

}, { timestamps: true });

export default mongoose.model('Report', reportSchema);
