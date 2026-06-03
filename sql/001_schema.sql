-- =============================================================
-- Einsmart — PostgreSQL Schema v1.0
-- Migración completa desde MongoDB
-- =============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================
-- TENANTS
-- =============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    domain          VARCHAR(200),
    address         VARCHAR(300) DEFAULT '',
    phone           VARCHAR(50) DEFAULT '',
    contact_email   VARCHAR(200) DEFAULT '',
    annual_fee      NUMERIC(12,2) DEFAULT 0,
    academic_year   VARCHAR(10) DEFAULT '2026',
    payment_type    VARCHAR(50) DEFAULT 'paid',
    theme           JSONB DEFAULT '{"primaryColor":"#3b82f6","secondaryColor":"#1e293b"}',
    logo_url        VARCHAR(500) DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- USERS (staff, teachers, admins, apoderados, estudiantes)
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(200) NOT NULL,
    email               VARCHAR(200) NOT NULL,
    rut                 VARCHAR(20),
    phone               VARCHAR(50),
    address             VARCHAR(300),
    password_hash       VARCHAR(300) NOT NULL,
    role                VARCHAR(50) NOT NULL CHECK (role IN (
        'admin','sostenedor','director','utp','teacher','student','apoderado',
        'psicologo','orientador','asistente_aula','manipulador_alimento',
        'bibliotecario','secretario','paradocente','inspector_general',
        'trabajador_social','psicopedagogo','auxiliar','vigilante',
        'administrativo','tutor_empresa'
    )),
    profile_id          UUID,           -- link to students or guardians
    specialization      VARCHAR(200),
    must_change_password BOOLEAN DEFAULT FALSE,
    must_change_pin     BOOLEAN DEFAULT TRUE,
    signature_pin       VARCHAR(20) DEFAULT '1234',
    session_token       VARCHAR(500),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (email, tenant_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS users_rut_tenant_idx
    ON users (rut, tenant_id)
    WHERE rut IS NOT NULL AND rut <> '';

-- =============================================================
-- CAREERS (especialidades técnico-profesionales)
-- =============================================================
CREATE TABLE IF NOT EXISTS careers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(100) DEFAULT 'tecnico-profesional',
    code            VARCHAR(20),
    description     VARCHAR(500) DEFAULT '',
    head_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- COURSES (cursos / secciones)
-- =============================================================
CREATE TABLE IF NOT EXISTS courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    level           VARCHAR(100) NOT NULL,
    letter          VARCHAR(5) NOT NULL,
    code            VARCHAR(50),
    description     VARCHAR(500) DEFAULT '',
    teacher_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    career_id       UUID REFERENCES careers(id) ON DELETE SET NULL,
    collaborators   UUID[] DEFAULT '{}',
    academic_year   INTEGER DEFAULT 2026,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, name, academic_year)
);

-- =============================================================
-- SUBJECTS (asignaturas)
-- =============================================================
CREATE TABLE IF NOT EXISTS subjects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(200) NOT NULL,
    course_id           UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    is_complementary    BOOLEAN DEFAULT FALSE,
    is_technical        BOOLEAN DEFAULT FALSE,
    utp_validated       BOOLEAN DEFAULT FALSE,
    description         VARCHAR(500) DEFAULT '',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- STUDENTS (estudiantes)
-- =============================================================
CREATE TABLE IF NOT EXISTS students (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombres             VARCHAR(200) NOT NULL,
    apellidos           VARCHAR(200) NOT NULL,
    rut                 VARCHAR(20),
    matricula           VARCHAR(50),
    email               VARCHAR(200),
    genero              VARCHAR(30) DEFAULT 'No informado',
    edad                INTEGER,
    fecha_nacimiento    DATE,
    direccion           VARCHAR(300) DEFAULT '',
    foto_url            VARCHAR(500) DEFAULT '',
    estado              VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo')),
    nationality         VARCHAR(50) DEFAULT 'Chilena',
    tipo_identificador  VARCHAR(30) DEFAULT 'RUT',
    etnia               VARCHAR(100) DEFAULT '',
    programa_pie        BOOLEAN DEFAULT FALSE,
    salud               JSONB DEFAULT '{}',
    ficha_familiar      JSONB DEFAULT '{}',
    certificados        JSONB DEFAULT '[]',
    course_id           UUID REFERENCES courses(id) ON DELETE SET NULL,
    career_id           UUID REFERENCES careers(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS students_rut_tenant_idx
    ON students (rut, tenant_id)
    WHERE rut IS NOT NULL AND rut <> '';
CREATE INDEX IF NOT EXISTS students_course_idx ON students(course_id);
CREATE INDEX IF NOT EXISTS students_tenant_idx ON students(tenant_id);

-- =============================================================
-- GUARDIANS (apoderados)
-- =============================================================
CREATE TABLE IF NOT EXISTS guardians (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
    nombre          VARCHAR(200) NOT NULL,
    apellidos       VARCHAR(200) DEFAULT '',
    rut             VARCHAR(20),
    direccion       VARCHAR(300) DEFAULT '',
    telefono        VARCHAR(100) DEFAULT '',
    correo          VARCHAR(200) DEFAULT '',
    tipo            VARCHAR(30) DEFAULT 'principal',
    parentesco      VARCHAR(100) DEFAULT '',
    financial_status VARCHAR(50) DEFAULT 'solvente',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS guardians_student_idx ON guardians(student_id);

-- =============================================================
-- ENROLLMENTS (matrículas)
-- =============================================================
CREATE TABLE IF NOT EXISTS enrollments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id     UUID REFERENCES guardians(id) ON DELETE SET NULL,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    period          VARCHAR(20) NOT NULL DEFAULT '2026',
    status          VARCHAR(30) DEFAULT 'confirmada' CHECK (status IN (
        'pendiente','confirmada','rechazada','activo','activa',
        'pre-matricula','inscrito'
    )),
    fee             NUMERIC(12,2) DEFAULT 0,
    notes           TEXT DEFAULT '',
    documents       JSONB DEFAULT '[]',
    documentacion   JSONB DEFAULT '{}',
    academic_year   INTEGER DEFAULT 2026,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, student_id, period)
);
CREATE INDEX IF NOT EXISTS enrollments_student_idx ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON enrollments(course_id);

-- =============================================================
-- EVALUATIONS (evaluaciones)
-- =============================================================
CREATE TABLE IF NOT EXISTS evaluations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
    subject_id      UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL,
    type            VARCHAR(50) DEFAULT 'sumativa',
    category        VARCHAR(50) DEFAULT 'planificada',
    max_score       NUMERIC(5,2) DEFAULT 7,
    period          VARCHAR(50) DEFAULT '1_semestre',
    date            DATE,
    questions       JSONB DEFAULT '[]',
    objectives      JSONB DEFAULT '[]',
    status          VARCHAR(30) DEFAULT 'pending',
    academic_year   INTEGER DEFAULT 2026,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS evaluations_course_idx ON evaluations(course_id);
CREATE INDEX IF NOT EXISTS evaluations_subject_idx ON evaluations(subject_id);

-- =============================================================
-- GRADES (calificaciones)
-- =============================================================
CREATE TABLE IF NOT EXISTS grades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    evaluation_id   UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score           NUMERIC(5,2) NOT NULL,
    status          VARCHAR(30) DEFAULT 'graded' CHECK (status IN ('graded','justified','pending')),
    comments        TEXT DEFAULT '',
    academic_year   INTEGER DEFAULT 2026,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (evaluation_id, student_id)
);
CREATE INDEX IF NOT EXISTS grades_student_idx ON grades(student_id);
CREATE INDEX IF NOT EXISTS grades_evaluation_idx ON grades(evaluation_id);

-- =============================================================
-- ATTENDANCES (asistencia)
-- =============================================================
CREATE TABLE IF NOT EXISTS attendances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fecha           DATE NOT NULL,
    estado          VARCHAR(30) DEFAULT 'presente' CHECK (estado IN (
        'presente','ausente','justificado','atraso','atrasado'
    )),
    minutos_atraso  INTEGER DEFAULT 0,
    observacion     TEXT DEFAULT '',
    is_signed       BOOLEAN DEFAULT FALSE,
    registered_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    academic_year   INTEGER DEFAULT 2026,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS attendances_student_fecha_idx ON attendances(student_id, fecha);
CREATE INDEX IF NOT EXISTS attendances_student_idx ON attendances(student_id);

-- =============================================================
-- SCHEDULES (horarios)
-- =============================================================
CREATE TABLE IF NOT EXISTS schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
    subject_id      UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time      VARCHAR(10) NOT NULL,
    end_time        VARCHAR(10) NOT NULL,
    block_id        INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS schedules_course_idx ON schedules(course_id);

-- =============================================================
-- CLASS_LOGS (libro de clases — lecciones)
-- =============================================================
CREATE TABLE IF NOT EXISTS class_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id           UUID REFERENCES courses(id) ON DELETE CASCADE,
    subject_id          UUID REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    date                DATE NOT NULL,
    block_number        INTEGER,
    content             TEXT DEFAULT '',
    attendance_count    INTEGER DEFAULT 0,
    is_signed           BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- CLASSBOOK_LOGS (auditoría libro de clases)
-- =============================================================
CREATE TABLE IF NOT EXISTS classbook_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    course_id   UUID REFERENCES courses(id) ON DELETE SET NULL,
    action      VARCHAR(100),
    details     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- EMPRESAS
-- =============================================================
CREATE TABLE IF NOT EXISTS empresas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rut             VARCHAR(20),
    razon_social    VARCHAR(300) NOT NULL,
    rubro           VARCHAR(200) DEFAULT '',
    direccion       VARCHAR(300) DEFAULT '',
    comuna          VARCHAR(100) DEFAULT '',
    contacto_nombre VARCHAR(200) DEFAULT '',
    email_contacto  VARCHAR(200) DEFAULT '',
    telefono        VARCHAR(100) DEFAULT '',
    estado          VARCHAR(30) DEFAULT 'Activo',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- ALTERNANCIAS
-- =============================================================
CREATE TABLE IF NOT EXISTS alternancias (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id          UUID REFERENCES students(id) ON DELETE CASCADE,
    career_id           UUID REFERENCES careers(id) ON DELETE SET NULL,
    empresa_id          UUID REFERENCES empresas(id) ON DELETE SET NULL,
    tutor_id            UUID REFERENCES users(id) ON DELETE SET NULL,
    profesor_supervisor UUID REFERENCES users(id) ON DELETE SET NULL,
    tipo                VARCHAR(100) DEFAULT 'Pasantía',
    estado              VARCHAR(50) DEFAULT 'Borrador',
    fecha_inicio        DATE,
    fecha_termino       DATE,
    seguro_escolar      BOOLEAN DEFAULT FALSE,
    plan_formativo      JSONB DEFAULT '{}',
    maestro_guia        JSONB DEFAULT '{}',
    modulos_dual        JSONB DEFAULT '[]',
    evaluaciones_periodicas JSONB DEFAULT '[]',
    bitacora            JSONB DEFAULT '[]',
    dispositivo_rastreo JSONB DEFAULT '{}',
    convenio_url        VARCHAR(500) DEFAULT '',
    observaciones       TEXT DEFAULT '',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS alternancias_student_idx ON alternancias(student_id);

-- =============================================================
-- ATRASOS
-- =============================================================
CREATE TABLE IF NOT EXISTS atrasos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
    fecha           TIMESTAMPTZ NOT NULL,
    minutos         INTEGER DEFAULT 0,
    justificado     BOOLEAN DEFAULT FALSE,
    motivo          TEXT DEFAULT '',
    registered_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- CITACIONES
-- =============================================================
CREATE TABLE IF NOT EXISTS citaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
    guardian_id     UUID REFERENCES guardians(id) ON DELETE SET NULL,
    issued_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    motivo          TEXT DEFAULT '',
    fecha_citacion  TIMESTAMPTZ,
    estado          VARCHAR(30) DEFAULT 'pendiente',
    dismissed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    dismissed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- ANOTACIONES
-- =============================================================
CREATE TABLE IF NOT EXISTS anotaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
    issued_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    tipo            VARCHAR(50) DEFAULT 'negativa',
    descripcion     TEXT DEFAULT '',
    fecha           DATE DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- MEDICAL_LICENSES (licencias médicas)
-- =============================================================
CREATE TABLE IF NOT EXISTS medical_licenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE NOT NULL,
    descripcion     TEXT DEFAULT '',
    estado          VARCHAR(30) DEFAULT 'Pendiente',
    documento_url   VARCHAR(500) DEFAULT '',
    approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- EVENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    description     TEXT DEFAULT '',
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    type            VARCHAR(100) DEFAULT 'general',
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- EVENT_REQUESTS
-- =============================================================
CREATE TABLE IF NOT EXISTS event_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requested_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT DEFAULT '',
    requested_date  TIMESTAMPTZ,
    status          VARCHAR(30) DEFAULT 'pending',
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- MESSAGES
-- =============================================================
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    subject         VARCHAR(300) DEFAULT '',
    body            TEXT DEFAULT '',
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- USER_NOTIFICATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS user_notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    message         TEXT DEFAULT '',
    type            VARCHAR(100) DEFAULT 'info',
    is_read         BOOLEAN DEFAULT FALSE,
    link            VARCHAR(500) DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON user_notifications(user_id);

-- =============================================================
-- AUDIT_LOGS
-- =============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(200) NOT NULL,
    entity      VARCHAR(100),
    entity_id   VARCHAR(100),
    details     JSONB DEFAULT '{}',
    ip          VARCHAR(50),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_idx ON audit_logs(tenant_id);

-- =============================================================
-- TARIFFS
-- =============================================================
CREATE TABLE IF NOT EXISTS tariffs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    amount          NUMERIC(12,2) DEFAULT 0,
    description     TEXT DEFAULT '',
    type            VARCHAR(100) DEFAULT 'mensualidad',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- ADMIN_DAYS
-- =============================================================
CREATE TABLE IF NOT EXISTS admin_days (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    reason          TEXT DEFAULT '',
    type            VARCHAR(100) DEFAULT 'feriado',
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- ALTERNANCIA_LOCATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS alternancia_locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alternancia_id  UUID REFERENCES alternancias(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    lat             NUMERIC(10,7),
    lng             NUMERIC(10,7),
    accuracy        NUMERIC(10,2),
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- PAYMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID REFERENCES students(id) ON DELETE SET NULL,
    guardian_id     UUID REFERENCES guardians(id) ON DELETE SET NULL,
    amount          NUMERIC(12,2) NOT NULL,
    status          VARCHAR(50) DEFAULT 'pending',
    method          VARCHAR(100) DEFAULT '',
    reference       VARCHAR(200) DEFAULT '',
    notes           TEXT DEFAULT '',
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- PAYROLL_PAYMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS payroll_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    period          VARCHAR(20) NOT NULL,
    gross_amount    NUMERIC(12,2) DEFAULT 0,
    net_amount      NUMERIC(12,2) DEFAULT 0,
    deductions      JSONB DEFAULT '[]',
    additions       JSONB DEFAULT '[]',
    status          VARCHAR(50) DEFAULT 'pending',
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- Trigger para actualizar updated_at automáticamente
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tenants','users','careers','courses','subjects','students','guardians',
    'enrollments','evaluations','grades','attendances','schedules',
    'class_logs','classbook_logs','empresas','alternancias','atrasos',
    'citaciones','anotaciones','medical_licenses','events','event_requests',
    'messages','user_notifications','tariffs','admin_days','payments','payroll_payments'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated ON %s;
       CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;
