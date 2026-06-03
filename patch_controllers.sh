#!/bin/bash
# patch_controllers.sh — Reemplaza patrones Mongoose por equivalentes PG en controllers
CTRL_DIR="/home/yuri/EinsmartBcknd/src/controllers"

echo "🔧 Parcheando controllers para PostgreSQL..."

for f in "$CTRL_DIR"/*.js; do
  # Skip ya parchados
  [[ "$f" == *authController* ]] && continue

  # 1. Reemplazar imports de modelos mongoose por pgModels
  sed -i "s|import Estudiante from '../models/estudianteModel.js';|import { Student as Estudiante } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import User from '../models/userModel.js';|import { User } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Course from '../models/courseModel.js';|import { Course } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Career from '../models/careerModel.js';|import { Career } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Subject from '../models/subjectModel.js';|import { Subject } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Enrollment from '../models/enrollmentModel.js';|import { Enrollment } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Grade from '../models/gradeModel.js';|import { Grade } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Attendance from '../models/attendanceModel.js';|import { Attendance } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Evaluation from '../models/evaluationModel.js';|import { Evaluation } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Schedule from '../models/scheduleModel.js';|import { Schedule } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Apoderado from '../models/apoderadoModel.js';|import { Guardian as Apoderado } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Empresa from '../models/empresaModel.js';|import { Empresa } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Alternancia from '../models/alternanciaModel.js';|import { Alternancia } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Tenant from '../models/tenantModel.js';|import { Tenant } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import AuditLog from '../models/auditLogModel.js';|import { AuditLog } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Atraso from '../models/atrasoModel.js';|import { Atraso } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Citacion from '../models/citacionModel.js';|import { Citacion } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import ClassLog from '../models/classLogModel.js';|import { ClassLog } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import ClassBookLog from '../models/classBookLogModel.js';|import { ClassBookLog } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import MedicalLicense from '../models/medicalLicenseModel.js';|import { MedicalLicense } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Notification from '../models/userNotificationModel.js';|import { Notification } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Tariff from '../models/tariffModel.js';|import { Tariff } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import AdminDay from '../models/adminDayModel.js';|import { AdminDay } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Event from '../models/eventModel.js';|import { Event } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import EventRequest from '../models/eventRequestModel.js';|import { EventRequest } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Message from '../models/messageModel.js';|import { Message } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import Payment from '../models/paymentModel.js';|import { Payment } from '../models/pgModels.js';|g" "$f"
  sed -i "s|import PayrollPayment from '../models/payrollPaymentModel.js';|import { PayrollPayment } from '../models/pgModels.js';|g" "$f"

  # 2. Eliminar imports de mongoose
  sed -i "/^import mongoose from 'mongoose';/d" "$f"
  sed -i "/^import { mongoose } from 'mongoose';/d" "$f"

  # 3. Reemplazar _id por id en accesos de objeto simples
  sed -i 's/\._id/\.id/g' "$f"
  sed -i 's/\["_id"\]/["id"]/g' "$f"

  # 4. Reemplazar tenantId por tenant_id en queries de BD (solo en .find, .findOne patterns)
  # Nota: dejamos req.user.tenantId intacto (viene del JWT)
  sed -i 's/{ tenantId/{ tenant_id/g' "$f"
  sed -i 's/tenantId: req\.user\.tenantId/tenant_id: req.user.tenantId/g' "$f"
  sed -i 's/tenantId: tenantId/tenant_id: tenantId/g' "$f"

  # 5. Reemplazar estudianteId por student_id en queries
  sed -i 's/{ estudianteId/{ student_id/g' "$f"
  sed -i 's/estudianteId: /student_id: /g' "$f"

  # 6. Reemplazar courseId/subjectId/careerId/teacherId/apoderadoId
  sed -i 's/{ courseId/{ course_id/g' "$f"
  sed -i 's/courseId: /course_id: /g' "$f"
  sed -i 's/{ subjectId/{ subject_id/g' "$f"
  sed -i 's/subjectId: /subject_id: /g' "$f"
  sed -i 's/{ careerId/{ career_id/g' "$f"
  sed -i 's/careerId: /career_id: /g' "$f"
  sed -i 's/{ teacherId/{ teacher_id/g' "$f"
  sed -i 's/teacherId: /teacher_id: /g' "$f"
  sed -i 's/{ apoderadoId/{ guardian_id/g' "$f"
  sed -i 's/apoderadoId: /guardian_id: /g' "$f"
  sed -i 's/{ evaluationId/{ evaluation_id/g' "$f"
  sed -i 's/evaluationId: /evaluation_id: /g' "$f"
  sed -i 's/{ empresaId/{ empresa_id/g' "$f"
  sed -i 's/empresaId: /empresa_id: /g' "$f"

  # 7. Eliminar .populate() y .lean() calls (no existen en PG)
  sed -i 's/\.populate([^)]*)//' "$f"
  sed -i 's/\.lean()//' "$f"
  sed -i 's/\.exec()//' "$f"

  # 8. Reemplazar findByIdAndUpdate por updateById
  sed -i 's/\.findByIdAndUpdate(\([^,]*\),\s*{\s*\$set:\s*\([^}]*\)\s*},\s*{ new: true })/\.updateById(\1, \2)/g' "$f"
  sed -i 's/\.findByIdAndDelete(/\.deleteById(/g' "$f"

  # 9. Reemplazar mongoose.Types.ObjectId
  sed -i 's/new mongoose\.Types\.ObjectId([^)]*)/\1/g' "$f"
  sed -i 's/mongoose\.Types\.ObjectId\.isValid/((v) => \/^[0-9a-f-]{36}$\/.test(String(v)))/g' "$f"

  # 10. passwordHash → password_hash field access
  sed -i 's/\.passwordHash/\.password_hash/g' "$f"
  sed -i 's/passwordHash:/password_hash:/g' "$f"
  sed -i 's/{ passwordHash/{ password_hash/g' "$f"

  # 11. mustChangePassword → must_change_password
  sed -i 's/\.mustChangePassword/\.must_change_password/g' "$f"
  sed -i 's/mustChangePassword:/must_change_password:/g' "$f"

  # 12. countDocuments → count (nuestro wrapper)
  sed -i 's/\.countDocuments(/\.count(/g' "$f"

  echo "  ✅ $(basename $f)"
done

echo ""
echo "🎉 Patching completado!"
