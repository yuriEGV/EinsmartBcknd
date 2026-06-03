#!/usr/bin/env node
// generate_model_shims.js — crea shims para todos los modelos Mongoose
// Los controllers importan, p.ej., '../models/userModel.js' → ahora redirigen a pgModels
import fs from 'fs';
import path from 'path';

const MODELS_DIR = '/home/yuri/EinsmartBcknd/src/models';

const MAP = {
    'tenantModel.js':           'Tenant',
    'userModel.js':             'User',
    'careerModel.js':           'Career',
    'courseModel.js':           'Course',
    'subjectModel.js':          'Subject',
    'estudianteModel.js':       'Student',
    'apoderadoModel.js':        'Guardian',
    'enrollmentModel.js':       'Enrollment',
    'evaluationModel.js':       'Evaluation',
    'gradeModel.js':            'Grade',
    'attendanceModel.js':       'Attendance',
    'scheduleModel.js':         'Schedule',
    'classLogModel.js':         'ClassLog',
    'classBookLogModel.js':     'ClassBookLog',
    'empresaModel.js':          'Empresa',
    'alternanciaModel.js':      'Alternancia',
    'alternanciaLocationModel.js': 'AlternanciaLocation',
    'atrasoModel.js':           'Atraso',
    'citacionModel.js':         'Citacion',
    'anotacionModel.js':        'Anotacion',
    'medicalLicenseModel.js':   'MedicalLicense',
    'eventModel.js':            'Event',
    'eventRequestModel.js':     'EventRequest',
    'messageModel.js':          'Message',
    'userNotificationModel.js': 'Notification',
    'auditLogModel.js':         'AuditLog',
    'tariffModel.js':           'Tariff',
    'adminDayModel.js':         'AdminDay',
    'paymentModel.js':          'Payment',
    'paymentPromiseModel.js':   'Payment',
    'payrollPaymentModel.js':   'PayrollPayment',
    'transactionModel.js':      'Payment',
    'reportModel.js':           'AuditLog',
    'rubricModel.js':           'AuditLog',
    'questionModel.js':         'AuditLog',
    'objectiveModel.js':        'AuditLog',
    'planningModel.js':         'AuditLog',
    'curriculumMaterialModel.js': 'AuditLog',
    'expenseModel.js':          'Payment',
};

for (const [file, exportName] of Object.entries(MAP)) {
    const content = `// Auto-generated shim — redirects to pgModels
export { ${exportName} as default, ${exportName} } from './pgModels.js';
`;
    const filepath = path.join(MODELS_DIR, file);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ ${file} → ${exportName}`);
}

// AlternanciaLocation needs special handling
fs.writeFileSync(
    path.join(MODELS_DIR, 'alternanciaLocationModel.js'),
    `export { Alternancia as default, Alternancia as AlternanciaLocation } from './pgModels.js';\n`,
    'utf8'
);
console.log('✅ alternanciaLocationModel.js shimmed');
console.log('\n🎉 All model shims generated!');
