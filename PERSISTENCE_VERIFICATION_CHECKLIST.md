# Checklist de Verificación: Persistencia de Datos

## Estado Actual

✅ **Todas las migraciones aplicadas**
✅ **Esquemas sincronizados con el código**
✅ **RLS limpiadas y configuradas correctamente**
✅ **Build sin errores**

## Qué Se Arregló

### 1. Base de Datos

| Problema | Solución | Estado |
|----------|----------|--------|
| Columnas faltantes en assets | Añadidas geography, sectors, asset_class_pro | ✅ |
| Falta cash_balance en settings | Añadida | ✅ |
| Nombres de campos incorrectos en robo_advisors | Renombradas invested_amount → invested_value, current_value → total_value | ✅ |
| RLS duplicadas/incompletas | Eliminadas 20+, creadas 16 limpias con WITH CHECK | ✅ |

### 2. Código

| Área | Cambio | Estado |
|------|--------|--------|
| usePortfolio.ts | Ya enviaba user_id correctamente | ✅ |
| useTransactions.ts | Ya implementaba RLS correctamente | ✅ |
| FundsTable.tsx | Integración de historial de transacciones | ✅ |
| TransactionHistory.tsx | Componente para gestionar movimientos | ✅ |

### 3. RLS Policies

**Assets table:**
```
✅ assets_select   - SELECT where auth.uid() = user_id
✅ assets_insert   - INSERT with check auth.uid() = user_id
✅ assets_update   - UPDATE where/with check auth.uid() = user_id
✅ assets_delete   - DELETE where auth.uid() = user_id
```

**Portfolio Settings:**
```
✅ settings_select  - SELECT where auth.uid() = user_id
✅ settings_insert  - INSERT with check auth.uid() = user_id
✅ settings_update  - UPDATE where/with check auth.uid() = user_id
✅ settings_delete  - DELETE where auth.uid() = user_id
```

**Robo Advisors:**
```
✅ robo_select  - SELECT where auth.uid() = user_id
✅ robo_insert  - INSERT with check auth.uid() = user_id
✅ robo_update  - UPDATE where/with check auth.uid() = user_id
✅ robo_delete  - DELETE where auth.uid() = user_id
```

**Transactions:**
```
✅ transactions_select  - SELECT where auth.uid() = user_id
✅ transactions_insert  - INSERT with check auth.uid() = user_id
✅ transactions_update  - UPDATE where/with check auth.uid() = user_id
✅ transactions_delete  - DELETE where auth.uid() = user_id
```

---

## Verificación Manual

### Paso 1: Limpiar Estado Anterior
```bash
# Opcional: Borrar localStorage si hay datos viejos
# Abrir DevTools → Application → Local Storage
# Buscar "portfolio-state" y eliminar si existe
```

### Paso 2: Login/Registro
1. ✅ Ir a http://localhost:5173/login
2. ✅ Crear una cuenta nueva (o usar existente)
3. ✅ Verifcar que redirecciona al dashboard

### Paso 3: Test Fondos
1. ✅ Ir a pestaña "Fondos"
2. ✅ Click "Añadir Fondo"
3. ✅ Llenar formulario:
   - Nombre: "Test Fund"
   - ISIN: "TEST123"
   - Entidad: "BBK"
   - Total Invertido: 5000
   - Nº Participaciones: 100
   - Precio Actual: 50
4. ✅ Click "Guardar Fondo"
5. ✅ El fondo aparece en la tabla
6. ✅ Ver en DevTools → Network: Request a `/assets` (POST)
7. ✅ Response status debe ser 200-201 (no 400, 403)

### Paso 4: Test Persistencia
1. ✅ Con el fondo visible
2. ✅ Press F5 (reload página)
3. ✅ Esperar a que cargue
4. ✅ **EL FONDO DEBE SEGUIR VISIBLE** (esto confirma que se guardó)

### Paso 5: Test Transacciones
1. ✅ En la tabla de Fondos
2. ✅ Buscar el fondo creado
3. ✅ Click en botón 🕐 (History)
4. ✅ Se abre dialog "Historial de Movimientos"
5. ✅ Click "+ Agregar Movimiento"
6. ✅ Llenar:
   - Importe: 5000
   - Fecha: (usa hoy)
   - Descripción: "Test transaction"
7. ✅ Click "Guardar"
8. ✅ La transacción aparece en la tabla
9. ✅ Total debe mostrar 5000 EUR
10. ✅ Field "Aportado" en tabla principal se actualiza a 5000

### Paso 6: Test Persistencia Transacciones
1. ✅ Con transacción visible
2. ✅ Press F5 (reload)
3. ✅ **LA TRANSACCIÓN DEBE SEGUIR AHÍ**
4. ✅ Click en 🕐 nuevamente
5. ✅ Debe mostrar la transacción que agregamos

### Paso 7: Test Isolamiento por Usuario
1. ✅ Login con Usuario A
2. ✅ Crear Fondo A
3. ✅ Logout
4. ✅ Register/Login como Usuario B
5. ✅ Ir a "Fondos"
6. ✅ **NO debe ver Fondo A**
7. ✅ Crear Fondo B
8. ✅ Login nuevamente como Usuario A
9. ✅ **Solo debe ver Fondo A, NO Fondo B**

---

## DevTools - Cómo Diagnosticar Si Hay Errores

### Network Tab

1. ✅ Abrir DevTools (F12)
2. ✅ Ir a "Network"
3. ✅ Agregar un fondo
4. ✅ Buscar request `/rest/v1/assets` (POST)
5. ✅ Click para expandir
6. ✅ **Request** tab:
   - Debe incluir: `user_id: "uuid-del-usuario"`
   - `buy_price`, `current_price`, `shares`, etc.
7. ✅ **Response** tab:
   - Status: 201 (Created) ✓
   - Debe retornar el objeto insertado
8. ❌ Si es 400/403:
   - Copiar el JSON de error
   - Revisar mensaje (falta columna, RLS rechazó, etc.)

### Console Tab

1. ✅ Abrir DevTools (F12)
2. ✅ Ir a "Console"
3. ✅ Buscar mensajes de error
4. ✅ Si ves errores:
   - "Error cargando activos: ..."
   - "Error añadiendo transacción: ..."
   - Son signos de problemas de RLS o esquema
5. ✅ Copiar el mensaje y revisar el documento DATABASE_PERSISTENCE_FIX.md

### Supabase Dashboard

1. ✅ Ir a https://app.supabase.com
2. ✅ Proyecto → Database → Tables
3. ✅ Seleccionar "assets"
4. ✅ Ver si aparecen filas
5. ✅ Seleccionar "transactions"
6. ✅ Ver si aparecen filas
7. ✅ Si no aparecen: hay problema de inserción
8. ✅ Si aparecen pero con user_id = NULL: problema de RLS

---

## Comandos Útiles

### Ver todas las transacciones de tu usuario

En Supabase SQL Editor:
```sql
SELECT * FROM transactions
WHERE user_id = auth.uid()
ORDER BY date DESC;
```

### Ver todos tus fondos

```sql
SELECT id, name, ticker, user_id, shares, buy_price, current_price
FROM assets
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Verificar que RLS está activa

```sql
SELECT schemaname, tablename, policname
FROM pg_policies
WHERE tablename IN ('assets', 'transactions', 'portfolio_settings', 'robo_advisors')
ORDER BY tablename;
```

---

## Problemas Comunes y Soluciones

### Problema: "Activos no se guardan"

**Diagnóstico:**
1. DevTools → Network → POST /assets
2. Ver response: ¿Qué error?

**Soluciones posibles:**

| Error | Causa | Solución |
|-------|-------|----------|
| 400 Bad Request | Columna faltante | Revisar que todas las columnas existen |
| 403 Forbidden | RLS rechazando | Verificar que user_id se envía |
| timeout | Supabase lento | Esperar o reintentar |
| "invalid input" | Tipo de dato incorrecto | shares debe ser number, no string |

### Problema: "Datos desaparecen al refresh"

**Causa más probable:** El INSERT funcionó en UI pero falló silenciosamente en BD

**Diagnóstico:**
1. Abrir DevTools → Console
2. Buscar errores
3. Verificar DevTools → Network
4. Ver si hubo error en response

**Solución:**
- Si ves error: consultar la tabla anterior
- Si NO ves error: revisar Supabase → ver si fila se creó
- Si la fila existe: problema es en SELECT (RLS bloqueando lectura)

### Problema: "Usuario A ve datos de Usuario B"

**Causa:** RLS no está funcionando

**Verificación:**
```sql
-- Ejecutar como usuario A
SELECT COUNT(*) FROM assets WHERE user_id = auth.uid();
-- Debe retornar X (solo assets de A)

-- Ejecutar como usuario B
SELECT COUNT(*) FROM assets WHERE user_id = auth.uid();
-- Debe retornar Y (solo assets de B)
-- X + Y debe ser total, NO superpuesto
```

**Solución:**
- Revisar que RLS está ENABLED
- Revisar que policies tienen `auth.uid() = user_id`
- Eliminar cualquier política que tenga `USING (true)`

---

## Resumen Final

Si pasas todos estos tests ✅, los datos está siendo persistidos correctamente:

- ✅ Fondos aparecen después de refresh
- ✅ Transacciones aparecen después de refresh
- ✅ Usuarios no ven datos unos de otros
- ✅ DevTools Network muestra POST 201 (Created)
- ✅ Supabase dashboard muestra filas en tablas

**Felicitaciones - La persistencia está funcionando!**

---

**Fecha**: 2026-04-03
**Migraciones aplicadas**: 2
**Status**: ✅ LISTO PARA TESTING
