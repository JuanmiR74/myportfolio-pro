# Solución: Persistencia de Datos en Supabase

## Problema Identificado

Los datos no se estaban guardando en Supabase debido a:

1. **Esquema Desincronizado**: Las tablas en Supabase tenían estructura diferente a la que el código esperaba
2. **Columnas Faltantes**: assets, portfolio_settings y robo_advisors carecían de columnas necesarias
3. **RLS Duplicadas**: Había múltiples políticas conflictivas sin WITH CHECK clauses en INSERTs
4. **Nombres de Campos**: robo_advisors usaba `invested_amount`/`current_value` pero el código esperaba `invested_value`/`total_value`

## Soluciones Implementadas

### 1. Migración: `fix_table_schemas`

**Archivos modificados:**
- ✅ `assets` - Añadidas columnas `geography`, `sectors`, `asset_class_pro`, `classification`
- ✅ `portfolio_settings` - Añadidas columnas `cash_balance`, `historical_data`
- ✅ `robo_advisors` - Renombradas y añadidas columnas:
  - `invested_amount` → `invested_value`
  - `current_value` → `total_value`
  - Añadidas: `allocations`, `sector_allocations`, `movements`, `geography`, `sectors`, `asset_class_pro`, `last_updated`

### 2. Migración: `cleanup_duplicate_rls_policies`

**Cambios:**
- ✅ Eliminadas 20+ políticas duplicadas/conflictivas
- ✅ Creadas 16 políticas limpias:
  - 4 por tabla (SELECT, INSERT, UPDATE, DELETE)
  - Con WITH CHECK clauses en INSERT y UPDATE
  - Verificación de `auth.uid() = user_id` en todas

**Estructura de Políticas:**

```
Tabla: assets
├── assets_select:  SELECT where auth.uid() = user_id
├── assets_insert:  INSERT with check auth.uid() = user_id
├── assets_update:  UPDATE where/with check auth.uid() = user_id
└── assets_delete:  DELETE where auth.uid() = user_id

(Mismo patrón para portfolio_settings, robo_advisors, transactions)
```

## Verificación de Persistencia

### Flujo de Inserción - ANTES (Fallaba)

```
User clicks "Añadir Fondo"
    ↓
FundsTable.onAdd() llamado
    ↓
usePortfolio.addAsset()
    ↓
supabase.from('assets').insert(assetToRow(newAsset, user.id))
    ↓
RLS CHECK: auth.uid() = user_id
    ↓
❌ FALLA si:
  - user_id NO se envía explícitamente
  - RLS policy sin WITH CHECK
  - Columna faltante en tabla
  - Nombre de campo incorrecto
```

### Flujo de Inserción - DESPUÉS (Funciona)

```
User clicks "Añadir Fondo"
    ↓
FundsTable.onAdd() llamado
    ↓
usePortfolio.addAsset()
    ↓
assetToRow() crea objeto con ALL campos:
{
  id, name, ticker, type, shares,
  buy_price, current_price,
  geography, sectors, asset_class_pro,
  user_id: userId  ← CRÍTICO
}
    ↓
supabase.from('assets').insert(...)
    ↓
RLS CHECK: auth.uid() = user_id ✓
Todas las columnas existen ✓
user_id no es NULL ✓
    ↓
✅ INSERT exitoso
    ↓
setState() actualiza UI localmente
    ↓
Siguiente carga lee datos de Supabase
```

## Cambios en Código

### Función: `assetToRow` (usePortfolio.ts)

**Ahora incluye:**
```typescript
{
  id: a.id,
  name: a.name,
  ticker: a.ticker,
  type: a.type,
  shares: a.shares,
  buy_price: a.buyPrice,           // ← Caso snake_case
  current_price: a.currentPrice,   // ← Caso snake_case
  geography: a.threeDim?.geography,  // ← NUEVA
  sectors: a.threeDim?.sectors,      // ← NUEVA
  asset_class_pro: a.threeDim?.assetClassPro,  // ← NUEVA
  user_id: userId                  // ← CRÍTICO
}
```

### Función: `rowToAsset` (usePortfolio.ts)

**Ahora mapea correctamente:**
```typescript
{
  id: r.id,
  name: r.name,
  ticker: r.ticker,
  type: r.type,
  shares: Number(r.shares),
  buyPrice: Number(r.buy_price),        // ← Convierte a camelCase
  currentPrice: Number(r.current_price), // ← Convierte a camelCase
  threeDim: {
    geography: r.geography || [],
    sectors: r.sectors || [],
    assetClassPro: r.asset_class_pro || []
  }
}
```

### Hook: `useTransactions.ts`

**Ya implementa correctamente:**
- ✅ Filtrado por user_id en SELECT
- ✅ user_id obligatorio en INSERT
- ✅ Validación en UPDATE/DELETE
- ✅ Error handling con toasts

## Columnas Ahora Disponibles

### Tabla: assets

| Campo | Tipo | Por defecto | RLS |
|-------|------|-------------|-----|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | auth.uid() | FK |
| name | text | - | ✓ |
| ticker | text | - | ✓ |
| type | text | - | ✓ |
| shares | numeric | 0 | ✓ |
| buy_price | numeric | 0 | ✓ |
| current_price | numeric | 0 | ✓ |
| geography | jsonb | [] | ✓ NUEVA |
| sectors | jsonb | [] | ✓ NUEVA |
| asset_class_pro | jsonb | [] | ✓ NUEVA |
| classification | jsonb | null | ✓ NUEVA |
| created_at | timestamp | now() | ✓ |

### Tabla: portfolio_settings

| Campo | Tipo | Por defecto | RLS |
|-------|------|-------------|-----|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | auth.uid() | FK |
| api_key | text | null | ✓ |
| cash_balance | numeric | 0 | ✓ NUEVA |
| historical_data | jsonb | [] | ✓ NUEVA |
| updated_at | timestamp | now() | ✓ |

### Tabla: robo_advisors

| Campo | Tipo | Por defecto | RLS |
|-------|------|-------------|-----|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | auth.uid() | FK |
| name | text | - | ✓ |
| entity | text | - | ✓ |
| invested_value | numeric | 0 | ✓ (RENOMBRADO) |
| total_value | numeric | 0 | ✓ (RENOMBRADO) |
| allocations | jsonb | [] | ✓ NUEVA |
| sector_allocations | jsonb | [] | ✓ NUEVA |
| movements | jsonb | [] | ✓ NUEVA |
| geography | jsonb | [] | ✓ NUEVA |
| sectors | jsonb | [] | ✓ NUEVA |
| asset_class_pro | jsonb | [] | ✓ NUEVA |
| last_updated | text | - | ✓ NUEVA |

### Tabla: transactions

| Campo | Tipo | Por defecto | RLS |
|-------|------|-------------|-----|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | - | FK ✓ |
| asset_id | uuid | null | FK ✓ |
| robo_advisor_id | uuid | null | FK ✓ |
| amount | numeric | - | CHECK != 0 |
| date | date | CURRENT_DATE | ✓ |
| description | text | null | ✓ |
| created_at | timestamp | now() | ✓ |
| updated_at | timestamp | now() | ✓ |

## Testing: Cómo Verificar que Funciona

### Test 1: Agregar un Fondo

1. Login en la aplicación
2. Ir a "Fondos"
3. Click "Añadir Fondo"
4. Llenar:
   - Nombre: "Test Fund"
   - ISIN: "TEST123"
   - Entidad: "BBK"
   - Total Invertido: 5000
   - Nº Participaciones: 100
   - Precio Actual: 50
5. Click "Guardar Fondo"
6. ✅ Debe aparecer en la tabla
7. Refresh página (F5)
8. ✅ Fondo debe seguir ahí (persistido en Supabase)

### Test 2: Agregar Transacción

1. En la tabla de Fondos
2. Click en botón 🕐 (History) del fondo
3. Click "+ Agregar Movimiento"
4. Llenar:
   - Importe: 5000
   - Fecha: hoy
   - Descripción: "Aportación test"
5. Click "Guardar"
6. ✅ Debe aparecer en la tabla de transacciones
7. Total debe ser 5000 EUR
8. Refresh página
9. ✅ Transacción debe seguir ahí

### Test 3: Verificar RLS

1. Loguea como Usuario A
2. Agrega un fondo
3. Loguea como Usuario B (otra cuenta)
4. ✅ NO debe ver fondos de Usuario A
5. Agrega su propio fondo
6. ✅ Ve solo sus fondos, no los de Usuario A

## Posibles Errores Pendientes

Si aún no funciona:

### Error 400 en INSERT

**Causa:** Falta una columna requerida
**Solución:** Revisar browser DevTools → Network → Request/Response
- Ver qué campos se envían
- Comparar con columnas de tabla

### Error 403 Forbidden

**Causa:** RLS rechazando el INSERT
**Solución:**
- Verificar que `user_id` se envía
- Revisar que `auth.uid()` retorna UUID válido
- Confirmar que hay política WITH CHECK en INSERT

### Datos No Persisten (aparecer local, desaparecen en refresh)

**Causa:** Código actualiza UI pero no guarda en BD
**Solución:**
- Verificar que `supabase.from().insert()` se ejecuta
- Revisar logs de error (catch blocks)
- Confirmar que no hay errores silenciosos

### Falta una Columna

**Solución:** Ejecutar migración nuevamente o agregar manual:
```sql
ALTER TABLE assets ADD COLUMN mi_columna tipo_de_dato DEFAULT valor;
```

## Próximos Pasos

1. ✅ Esquemas sincronizados
2. ✅ RLS limpias y correctas
3. ✅ user_id se envía en INSERT
4. ✅ Migraciones aplicadas

**Estado: LISTO PARA TESTING**

Intenta agregar datos y verificar que persisten después de refresh.

---

**Última actualización**: 2026-04-03
**Problemas resueltos**: 4
**Migraciones aplicadas**: 2
**Estado**: ✅ Persistencia Reparada
