# School Intranet API - Documentación para Postman

## Base URL
```
http://localhost:5000/api
```

## 1. ESTUDIANTES (Students)

### GET - Obtener todos los estudiantes
```
GET /api/estudiantes
```

### GET - Obtener estudiante por ID
```
GET /api/estudiantes/:id
```

### POST - Crear nuevo estudiante
```
POST /api/estudiantes
Content-Type: application/json

{
    "nombre": "Juan",
    "apellido": "Pérez",
    "edad": 16,
    "grado": "10mo"
}
```

### PUT - Actualizar estudiante
```
PUT /api/estudiantes/:id
Content-Type: application/json

{
    "nombre": "Juan Carlos",
    "apellido": "Pérez",
    "edad": 17,
    "grado": "11mo"
}
```

### DELETE - Eliminar estudiante
```
DELETE /api/estudiantes/:id
```

---

## 2. CURSOS (Courses)

### GET - Obtener todos los cursos
```
GET /api/courses
```

### GET - Obtener cursos por institución
```
GET /api/courses/tenant/:tenantId
```

### GET - Obtener curso por ID
```
GET /api/courses/:id
```

### POST - Crear nuevo curso
```
POST /api/courses
Content-Type: application/json

{
    "tenantId": "64a1b2c3d4e5f6789012345",
    "name": "Matemáticas Avanzadas",
    "code": "MATH-101",
    "teacherId": "64a1b2c3d4e5f6789012346"
}
```

### PUT - Actualizar curso
```
PUT /api/courses/:id
Content-Type: application/json

{
    "name": "Matemáticas Superiores",
    "code": "MATH-102"
}
```

### DELETE - Eliminar curso
```
DELETE /api/courses/:id
```

---

## 3. ASISTENCIA (Attendance)

### GET - Obtener todas las asistencias
```
GET /api/attendance
```

### GET - Obtener asistencias por curso
```
GET /api/attendance/course/:courseId
```

### GET - Obtener asistencias por estudiante
```
GET /api/attendance/student/:studentId
```

### GET - Obtener asistencias por rango de fechas
```
GET /api/attendance/date-range?startDate=2024-01-01&endDate=2024-01-31
```

### GET - Obtener asistencia por ID
```
GET /api/attendance/:id
```

### POST - Crear nuevo registro de asistencia
```
POST /api/attendance
Content-Type: application/json

{
    "tenantId": "64a1b2c3d4e5f6789012345",
    "courseId": "64a1b2c3d4e5f6789012347",
    "studentId": "64a1b2c3d4e5f6789012348",
    "date": "2024-01-15T08:00:00.000Z",
    "status": "present"
}
```

### PUT - Actualizar asistencia
```
PUT /api/attendance/:id
Content-Type: application/json

{
    "status": "late"
}
```

### DELETE - Eliminar asistencia
```
DELETE /api/attendance/:id
```

---

## 4. EVALUACIONES (Evaluations)

### GET - Obtener todas las evaluaciones
```
GET /api/evaluations
```

### GET - Obtener evaluaciones por curso
```
GET /api/evaluations/course/:courseId
```

### GET - Obtener evaluaciones por institución
```
GET /api/evaluations/tenant/:tenantId
```

### GET - Obtener evaluación por ID
```
GET /api/evaluations/:id
```

### POST - Crear nueva evaluación
```
POST /api/evaluations
Content-Type: application/json

{
    "tenantId": "64a1b2c3d4e5f6789012345",
    "courseId": "64a1b2c3d4e5f6789012347",
    "title": "Examen Parcial de Matemáticas",
    "maxScore": 100,
    "date": "2024-02-15T10:00:00.000Z"
}
```

### PUT - Actualizar evaluación
```
PUT /api/evaluations/:id
Content-Type: application/json

{
    "title": "Examen Final de Matemáticas",
    "maxScore": 120
}
```

### DELETE - Eliminar evaluación
```
DELETE /api/evaluations/:id
```

---

## 5. CALIFICACIONES (Grades)

### GET - Obtener todas las calificaciones
```
GET /api/grades
```

### GET - Obtener calificaciones por estudiante
```
GET /api/grades/student/:studentId
```

### GET - Obtener calificaciones por evaluación
```
GET /api/grades/evaluation/:evaluationId
```

### GET - Obtener calificaciones por institución
```
GET /api/grades/tenant/:tenantId
```

### GET - Obtener calificación por ID
```
GET /api/grades/:id
```

### POST - Crear nueva calificación
```
POST /api/grades
Content-Type: application/json

{
    "tenantId": "64a1b2c3d4e5f6789012345",
    "evaluationId": "64a1b2c3d4e5f6789012349",
    "studentId": "64a1b2c3d4e5f6789012348",
    "score": 85
}
```

### PUT - Actualizar calificación
```
PUT /api/grades/:id
Content-Type: application/json

{
    "score": 90
}
```

### DELETE - Eliminar calificación
```
DELETE /api/grades/:id
```

---

## 6. INSCRIPCIONES (Enrollments)

### GET - Obtener todas las inscripciones
```
GET /api/enrollments
```

### GET - Obtener inscripciones por estudiante
```
GET /api/enrollments/student/:studentId
```

### GET - Obtener inscripciones por curso
```
GET /api/enrollments/course/:courseId
```

### GET - Obtener inscripciones por institución
```
GET /api/enrollments/tenant/:tenantId
```

### GET - Obtener inscripciones por período
```
GET /api/enrollments/period/:period
```

### GET - Obtener inscripción por ID
```
GET /api/enrollments/:id
```

### POST - Crear nueva inscripción
```
POST /api/enrollments
Content-Type: application/json

{
    "tenantId": "64a1b2c3d4e5f6789012345",
    "studentId": "64a1b2c3d4e5f6789012348",
    "courseId": "64a1b2c3d4e5f6789012347",
    "period": "2024-1"
}
```

### PUT - Actualizar inscripción
```
PUT /api/enrollments/:id
Content-Type: application/json

{
    "period": "2024-2"
}
```

### DELETE - Eliminar inscripción
```
DELETE /api/enrollments/:id
```

---

## 7. USUARIOS (Users)

### GET - Obtener todos los usuarios
```
GET /api/users
```

### GET - Obtener usuarios por institución
```
GET /api/users/tenant/:tenantId
```

### GET - Obtener usuarios por rol
```
GET /api/users/role/:role
```

### GET - Obtener usuario por ID
```
GET /api/users/:id
```

### POST - Crear nuevo usuario
```
POST /api/users
Content-Type: application/json

{
    "name": "Profesor García",
    "email": "profesor.garcia@escuela.com",
    "password": "password123",
    "role": "teacher",
    "tenantId": "64a1b2c3d4e5f6789012345"
}
```

### PUT - Actualizar usuario
```
PUT /api/users/:id
Content-Type: application/json

{
    "name": "Profesor García López",
    "role": "admin"
}
```

### DELETE - Eliminar usuario
```
DELETE /api/users/:id
```

---

## 8. INSTITUCIONES (Tenants)

### GET - Obtener todas las instituciones
```
GET /api/tenants
```

### GET - Obtener institución por ID
```
GET /api/tenants/:id
```

### POST - Crear nueva institución
```
POST /api/tenants
Content-Type: application/json

{
    "name": "Escuela Primaria San José",
    "domain": "san-jose.edu"
}
```

### PUT - Actualizar institución
```
PUT /api/tenants/:id
Content-Type: application/json

{
    "name": "Escuela Primaria San José de la Montaña",
    "domain": "san-jose-montana.edu"
}
```

### DELETE - Eliminar institución
```
DELETE /api/tenants/:id
```

---

## 9. AUTENTICACIÓN (Auth)

### POST - Login
```
POST /api/auth/login
Content-Type: application/json

{
    "email": "admin@escuela.com",
    "password": "password123"
}
```

### POST - Register
```
POST /api/auth/register
Content-Type: application/json

{
    "name": "Administrador",
    "email": "admin@escuela.com",
    "password": "password123",
    "role": "admin",
    "tenantId": "64a1b2c3d4e5f6789012345"
}
```

---

## 10. REPORTES (Reports)

### GET - Obtener reportes
```
GET /api/reports
```

---

## Códigos de Estado HTTP

- **200**: OK - Solicitud exitosa
- **201**: Created - Recurso creado exitosamente
- **204**: No Content - Recurso eliminado exitosamente
- **400**: Bad Request - Error en la solicitud
- **404**: Not Found - Recurso no encontrado
- **500**: Internal Server Error - Error interno del servidor

## Notas Importantes

1. **IDs**: Todos los IDs deben ser ObjectIds válidos de MongoDB
2. **Fechas**: Usar formato ISO 8601 (ej: "2024-01-15T08:00:00.000Z")
3. **Contraseñas**: Se hashean automáticamente al crear usuarios
4. **Roles**: Los roles válidos son: "admin", "teacher", "student"
5. **Status de Asistencia**: Los valores válidos son: "present", "absent", "late"
6. **Población**: Los endpoints automáticamente incluyen información relacionada (populate)

## Instalación de Dependencias

Antes de probar los endpoints, ejecuta:

```bash
cd backend
npm install
```

Esto instalará la nueva dependencia `bcryptjs` necesaria para el manejo de contraseñas.
