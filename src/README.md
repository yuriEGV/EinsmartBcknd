# Maritimo — Notas rápidas (enrollments & pagos)

Este archivo resume cómo usar las rutas de `enrollments` (matrícula), pagos y pruebas con Webpay/ML/Flow.

## Migración: `matricula` → `enrollments`
- La funcionalidad de matrícula fue consolidada en `/api/enrollments`.
- Quedan stubs (`matricula` routes/controller/model) que devuelven respuestas 410/301 para guiar a clientes antiguos.
- Usa `/api/enrollments` para crear, actualizar y subir documentos de matrícula.

## Variables de entorno (ver `src/.env.example`)
- `MONGO_URI` — URI a MongoDB
- `PORT` — puerto opcional (5000 por defecto)
- `WEBPAY_SECRET` / `TRANSBANK_SHARED_SECRET` — secretos para verificar firmas de Webpay (opcional en local)
- `FLOW_API_KEY`, `MERCADOLIBRE_ACCESS_TOKEN` — opcionales para proveedores

## Endpoints importantes
- Enrollments (matrículas):
  - `POST /api/enrollments` — crear inscripción (acepta `multipart/form-data` con campo `documents[]`)
  - `GET /api/enrollments` — listar
  - `GET /api/enrollments/estudiante/:estudianteId` — listar por estudiante
  - `POST /api/enrollments/:id/documents` — agregar archivos
- Payments:
  - `POST /api/payments` — crear payment desde `tariffId` (privado, requiere auth)
  - Webhooks públicos: `/api/payments/webhooks/mercadolibre`, `/api/payments/webhooks/flow`, `/api/payments/webhooks/webpay`

## Pruebas locales rápidas
1. Crear datos de prueba (genera `external_reference` usado por webhooks):
```powershell
node src/scripts/seedTestPayment.js
```
2. Iniciar servidor:
```powershell
node src/server.js
```
3. Crear una inscripción (ejemplo cURL):
```bash
curl -X POST http://localhost:5000/api/enrollments \
  -H "Authorization: Bearer <TOKEN>" \
  -F "estudianteId=<ESTUDIANTE_ID>" \
  -F "courseId=<COURSE_ID>" \
  -F "tenantId=<TENANT_ID>" \
  -F "period=2026" \
  -F "documents=@/path/to/file.pdf"
```

4. Simular webhook Webpay (usa `external_reference` del seed):
```bash
curl -X POST http://localhost:5000/api/payments/webhooks/webpay \
  -H "Content-Type: application/json" \
  -d '{"id":"webpay-123","status":"approved","reference":"TEST-EXT-..."}'
```

## Notas para desarrolladores
- Se cambió el campo en `Enrollment` a `estudianteId` para coincidir con el resto del proyecto.
- Revisar si integraciones externas (front-end o servicios) esperan `studentId` — actualiza si es necesario.
- El `webpayService` incluido es un shim para pruebas. Para producción usa el SDK oficial de Transbank.

Si quieres, puedo:
- Buscar y reemplazar automáticamente imports externos que usen `studentId` por `estudianteId`.
- Eliminar por completo los archivos `matricula*` del repo.
- Implementar la integración real con Transbank (necesitaré credenciales sandbox).
