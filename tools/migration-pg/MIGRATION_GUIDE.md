# Guía de Migración de MongoDB a PostgreSQL

Esta guía describe el procedimiento para migrar el backend genérico estándar de EinSmart (basado en MongoDB) a PostgreSQL para colegios clientes en entornos de producción local o dedicada.

---

## Prerrequisitos

1. **Base de Datos PostgreSQL:** Tener una instancia activa de PostgreSQL y una base de datos vacía creada para el colegio.
2. **Datos de Origen (Opcional):** Una base de datos MongoDB existente de la cual migrar información.
3. **Entorno Bash:** El script de parcheo automático (`patch_controllers.sh`) requiere un entorno compatible con Bash (Git Bash en Windows, Linux, o WSL).

---

## Procedimiento Paso a Paso

### 1. Inicializar la Estructura de PostgreSQL
Usa el archivo DDL proveído para crear las tablas, índices y relaciones necesarias en la base de datos PostgreSQL:

```bash
psql -h <host_db> -U <usuario> -d <nombre_db> -f tools/migration-pg/sql/001_schema.sql
```

### 2. Parchear Controladores del Backend
El backend estándar está codificado usando patrones Mongoose. Ejecuta el script de parcheo automático para adaptar todos los controladores y imports a PostgreSQL utilizando los shims provistos:

```bash
# Otorgar permisos de ejecución si es necesario
chmod +x tools/migration-pg/patch_controllers.sh

# Ejecutar el script (este buscará los controladores en src/controllers/)
./tools/migration-pg/patch_controllers.sh
```

### 3. Habilitar la capa de Modelos PostgreSQL
1. Copia el archivo de shims a la carpeta de modelos del backend:
   ```bash
   cp tools/migration-pg/shims/pgModels.js src/models/
   ```
2. Asegúrate de modificar `src/server.js` y `src/config/db.js` para usar el driver y pool de conexión de `pg` en lugar de Mongoose si deseas habilitarlo de forma nativa. Puedes guiarte por los commits de la rama `school/instituto-maritimo`.

### 4. Configurar Variables de Entorno
Añade la URI de conexión de PostgreSQL en tu archivo `.env`:

```env
PG_URI=postgresql://<usuario>:<contraseña>@<host_db>:5432/<nombre_db>
```

### 5. Migrar Datos (Si aplica)
Si tienes información existente en MongoDB y deseas migrarla a PostgreSQL, ejecuta los siguientes scripts:

```bash
# 1. Ejecutar la migración base de colegios, usuarios, cursos y matrículas
node tools/migration-pg/scripts/migrate_mongo_to_pg.js

# 2. Ingestar y migrar el histórico de notas (Grades)
node tools/migration-pg/scripts/migrate_grades.js
```

---

## Archivos Incluidos

- **`sql/001_schema.sql`:** DDL completo del esquema estándar para PostgreSQL.
- **`shims/pgModels.js`:** Capa ORM / Active Record simulada sobre `pg` que intercepta llamadas comunes para no romper la compatibilidad con el resto del código del backend.
- **`scripts/migrate_mongo_to_pg.js`:** Migrador secuencial de colecciones base.
- **`scripts/migrate_grades.js`:** Migrador de notas.
- **`patch_controllers.sh`:** Script sed automatizado para migrar controladores.
