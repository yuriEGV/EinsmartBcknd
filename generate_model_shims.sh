#!/bin/bash
# generate_model_shims.sh — genera shims para todos los modelos Mongoose
MODELS_DIR="/home/yuri/EinsmartBcknd/src/models"

declare -A MAP=(
  ["tenantModel.js"]="Tenant"
  ["userModel.js"]="User"
  ["careerModel.js"]="Career"
  ["courseModel.js"]="Course"
  ["subjectModel.js"]="Subject"
  ["estudianteModel.js"]="Student"
  ["apoderadoModel.js"]="Guardian"
  ["enrollmentModel.js"]="Enrollment"
  ["evaluationModel.js"]="Evaluation"
  ["gradeModel.js"]="Grade"
  ["attendanceModel.js"]="Attendance"
  ["scheduleModel.js"]="Schedule"
  ["classLogModel.js"]="ClassLog"
  ["classBookLogModel.js"]="ClassBookLog"
  ["empresaModel.js"]="Empresa"
  ["alternanciaModel.js"]="Alternancia"
  ["alternanciaLocationModel.js"]="Alternancia"
  ["atrasoModel.js"]="Atraso"
  ["citacionModel.js"]="Citacion"
  ["anotacionModel.js"]="Anotacion"
  ["medicalLicenseModel.js"]="MedicalLicense"
  ["eventModel.js"]="Event"
  ["eventRequestModel.js"]="EventRequest"
  ["messageModel.js"]="Message"
  ["userNotificationModel.js"]="Notification"
  ["auditLogModel.js"]="AuditLog"
  ["tariffModel.js"]="Tariff"
  ["adminDayModel.js"]="AdminDay"
  ["paymentModel.js"]="Payment"
  ["paymentPromiseModel.js"]="Payment"
  ["payrollPaymentModel.js"]="PayrollPayment"
  ["transactionModel.js"]="Payment"
  ["reportModel.js"]="AuditLog"
  ["rubricModel.js"]="AuditLog"
  ["questionModel.js"]="AuditLog"
  ["objectiveModel.js"]="AuditLog"
  ["planningModel.js"]="AuditLog"
  ["curriculumMaterialModel.js"]="AuditLog"
  ["expenseModel.js"]="Payment"
)

for file in "${!MAP[@]}"; do
  name="${MAP[$file]}"
  cat > "$MODELS_DIR/$file" << EOF
// Auto-generated shim — redirects to pgModels (MongoDB removed)
export { $name as default, $name } from './pgModels.js';
EOF
  echo "✅ $file → $name"
done

echo ""
echo "🎉 All model shims generated!"
