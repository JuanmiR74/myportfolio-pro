# Sistema de Transacciones - PortfolioX

## Descripción General

El sistema de transacciones reemplaza el campo 'Aportado' estático por un sistema dinámico basado en histórico. El campo **'Aportado'** ahora es el resultado calculado de la suma de todos los movimientos asociados a un activo.

---

## Arquitectura

### Base de Datos: Tabla `transactions`

```sql
CREATE TABLE transactions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  robo_advisor_id uuid REFERENCES robo_advisors(id) ON DELETE CASCADE,
  amount numeric,           -- Positivo: aportación | Negativo: retirada
  date date,
  description text,         -- Ej: "Aportación inicial", "Retirada parcial"
  created_at timestamptz,
  updated_at timestamptz
);

-- Índices para rendimiento
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_transactions_user_asset ON transactions(user_id, asset_id);
```

### Restricciones de Seguridad
- **RLS Activo**: Solo usuarios autenticados acceden a sus transacciones
- **user_id Obligatorio**: Cada transacción está vinculada a su propietario
- **amount ≠ 0**: No permite transacciones nulas
- **Asset o Robo**: Una transacción debe estar asociada a un activo O un robo-advisor

---

## Componentes

### 1. Hook `useTransactions` (`src/hooks/useTransactions.ts`)

Proporciona métodos CRUD para transacciones:

```typescript
const {
  fetchTransactions,      // Obtener movimientos de un activo
  calculateInvested,      // Calcular suma de aportaciones
  addTransaction,         // Crear nuevo movimiento
  updateTransaction,      // Editar movimiento existente
  deleteTransaction       // Eliminar movimiento
} = useTransactions();
```

**Métodos Principales:**

```typescript
// Obtener transacciones de un activo
const transactions = await fetchTransactions(assetId);

// Calcular total invertido en un activo
const invested = await calculateInvested(assetId);
// Retorna: suma de amount de todas las transacciones

// Agregar movimiento
await addTransaction({
  asset_id: 'asset-123',
  amount: 5000,              // Positivo = aportación
  date: '2026-04-02',
  description: 'Aportación inicial'
});

// Retirada
await addTransaction({
  asset_id: 'asset-123',
  amount: -1000,             // Negativo = retirada
  date: '2026-04-02',
  description: 'Retirada parcial'
});

// Actualizar transacción
await updateTransaction('tx-id', {
  amount: 6000,
  description: 'Aportación corregida'
});

// Eliminar transacción
await deleteTransaction('tx-id');
```

### 2. Componente `TransactionHistory` (`src/components/portfolio/TransactionHistory.tsx`)

Interfaz visual para gestionar el historial de movimientos de un activo.

**Props:**
```typescript
interface TransactionHistoryProps {
  assetId?: string;           // Activo a gestionar
  roboAdvisorId?: string;     // O robo-advisor
  onInvestedChanged?: (amount: number) => void;  // Callback cuando cambia total
}
```

**Características:**
- **Tabla de Movimientos**: Muestra todas las transacciones ordenadas por fecha (más reciente primero)
- **Saldo Calculado**: Muestra el total invertido (suma de transacciones)
- **Diálogo para Agregar**: Modal con campos:
  - Importe (positivo/negativo)
  - Fecha
  - Descripción (opcional)
- **Eliminar Movimientos**: Botón rojo para cada fila con confirmación
- **Color Dinámico**: Verdes para aportaciones (+), rojos para retiradas (-)

**Ejemplo de uso:**
```typescript
<TransactionHistory
  assetId="asset-uuid"
  onInvestedChanged={(invested) => {
    console.log('Nuevo total invertido:', invested);
  }}
/>
```

### 3. Integración en FundsTable

La tabla principal (`FundsTable.tsx`) ahora:

1. **Botón History**: Cada fondo tiene un nuevo botón con ícono `History`
2. **Dialog Modal**: Al hacer click, abre `TransactionHistory` en un modal
3. **Campo Aportado Read-Only**: Muestra el valor calculado, NO editable
4. **Auto-Sync**: Cuando se cierra el diálogo, actualiza el total en la tabla

**Cambios clave:**
```typescript
// Estado para almacenar montos invertidos por activo
const [investedAmounts, setInvestedAmounts] = useState<Record<string, number>>({});

// Campo Aportado usa valor calculado
const invested = investedAmounts[a.id] ?? a.buyPrice;
// Si hay transacciones, usa el total de transacciones
// Si no, usa el valor por defecto del activo

// Total de la tabla usa valores calculados
const totalInvested = filtered.reduce(
  (s, a) => investedAmounts[a.id] ?? a.buyPrice, 0
);
```

---

## Flujo Completo: Usuario Agrega Aportación

```
1. Usuario en pestaña "Fondos"
   ↓
2. Ve tabla con fondos
   ↓
3. Click en botón "History" (ícono de reloj)
   ↓
4. Se abre diálogo "Historial de Movimientos"
   ↓
5. Muestra transacciones previas + botón "Agregar Movimiento"
   ↓
6. Click en "Agregar Movimiento"
   ↓
7. Sub-diálogo con campos:
   - Importe: 5000 EUR
   - Fecha: 2026-04-02
   - Descripción: "Aportación inicial"
   ↓
8. Click "Guardar"
   ↓
9. addTransaction() inserta en tabla transactions
   ↓
10. calculateInvested() suma todos los movimientos
   ↓
11. onInvestedChanged callback actualiza el estado en FundsTable
   ↓
12. Campo "Aportado" en tabla se actualiza automáticamente
   ↓
13. Cierra diálogo
   ↓
14. FundsTable refleja nuevo valor
```

---

## Ejemplos de Uso

### Ejemplo 1: Aportación Inicial

```
Fecha: 2026-01-15
Importe: +5000 EUR
Descripción: "Aportación inicial"
```

Resultado: Campo "Aportado" = 5000 EUR

### Ejemplo 2: Aportación Adicional

```
Transacción 1: +5000 EUR (2026-01-15)
Transacción 2: +2000 EUR (2026-02-01)
```

Resultado: Campo "Aportado" = 7000 EUR

### Ejemplo 3: Aportación + Retirada

```
Transacción 1: +5000 EUR (2026-01-15)
Transacción 2: +3000 EUR (2026-02-01)
Transacción 3: -1000 EUR (2026-03-01)  // Retirada
```

Resultado: Campo "Aportado" = 7000 EUR

---

## Seguridad

### Validaciones Cliente
- Email y contraseña en login
- Importe no puede ser cero
- Fecha no puede estar vacía
- Asset o Robo-advisor obligatorio

### Base de Datos
- **RLS**: Solo el propietario ve/modifica sus transacciones
- **Constraints**:
  - `CHECK (amount != 0)`: Rechaza transacciones nulas
  - `CHECK (asset_id IS NOT NULL OR robo_advisor_id IS NOT NULL)`: Requiere destino
- **Foreign Keys**: Eliminar un activo elimina sus transacciones (CASCADE)

### Sincronización
- Las transacciones se sincronizan con Supabase inmediatamente
- Si hay error de red, se muestra toast de error
- Confirmación de eliminación antes de borrar

---

## Ventajas del Sistema

1. **Historial Completo**: Auditoría de todos los movimientos
2. **Aportado Dinámico**: Refleja la realidad (no se edita manualmente)
3. **Flexibilidad**: Soporta retiradas y correcciones
4. **Reportes**: Pueden generarse análisis de patrones de inversión
5. **Precisión**: Cálculos automáticos reducen errores
6. **Seguridad**: Datos auditables por usuario

---

## Migraciones Aplicadas

### Migration: `create_transactions_table`

- Crea tabla `transactions` con estructura completa
- Añade índices para queries rápidas
- Configura RLS y políticas de seguridad
- Establece restricciones de integridad

---

## Estado Actual

✅ **Implementado y Funcional**

- [x] Tabla `transactions` creada en Supabase
- [x] Hook `useTransactions` implementado
- [x] Componente `TransactionHistory` funcional
- [x] Integración en `FundsTable`
- [x] RLS configurado
- [x] Tests de compilación exitosos
- [x] Documentación completa

---

## Próximas Mejoras Opcionales

1. **Importación Batch**: Cargar múltiples transacciones desde CSV
2. **Reportes**: Generar PDF con historial de inversiones
3. **Análisis**: Gráficos de aportaciones en el tiempo
4. **Alertas**: Notificaciones de cambios significativos
5. **Exportación**: Descargar historial en Excel

---

**Última actualización**: 2026-04-02
**Estado de compilación**: ✓ Sin errores
