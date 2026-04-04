# Integración de Robo-Advisors con X-Ray Granular

## Estado: ✅ COMPLETADO

Todos los problemas de Lovable han sido corregidos. Los Robo-Advisors ahora integran correctamente el desglose profundo (X-Ray) y los sub-fondos.

---

## 1. Cambios en Tipos (types/portfolio.ts)

### Nuevo Propiedad: `entity`

```typescript
export interface RoboAdvisor {
  id: string;
  name: string;
  entity: string;  // ← NUEVA: Obligatorio (MyInvestor, BBK, etc.)
  totalValue: number;
  investedValue: number;
  lastUpdated: string;
  // ... resto de propiedades
  subFunds?: RoboSubFund[];
}
```

**Por qué**: La columna `entity` en Supabase es `NOT NULL` (obligatoria). El código debe enviar este valor siempre.

---

## 2. Mapeo de Base de Datos (usePortfolio.ts)

### Función: `roboToRow` - Convierte RoboAdvisor → BD (INSERT/UPDATE)

```typescript
function roboToRow(r: RoboAdvisor, userId: string): Record<string, unknown> {
  return {
    id: r.id,
    name: r.name,
    entity: r.entity,  // ← AÑADIDO: Obligatorio
    total_value: r.totalValue,
    invested_value: r.investedValue,
    last_updated: r.lastUpdated,
    allocations: JSON.parse(JSON.stringify(r.allocations || [])),
    sector_allocations: JSON.parse(JSON.stringify(r.sectorAllocations || [])),
    movements: JSON.parse(JSON.stringify(r.movements || [])),
    geography: JSON.parse(JSON.stringify(r.threeDim?.geography || [])),
    sectors: JSON.parse(JSON.stringify(r.threeDim?.sectors || [])),
    asset_class_pro: JSON.parse(JSON.stringify(r.threeDim?.assetClassPro || [])),
    sub_funds: JSON.parse(JSON.stringify(r.subFunds || [])),  // ← Columna key para X-Ray
    user_id: userId,
  };
}
```

### Función: `rowToRobo` - Convierte BD → RoboAdvisor (SELECT)

```typescript
function rowToRobo(r: any): RoboAdvisor {
  return {
    id: r.id,
    name: r.name,
    entity: r.entity,  // ← AÑADIDO: Mapear desde BD
    totalValue: Number(r.total_value),
    investedValue: Number(r.invested_value),
    lastUpdated: r.last_updated || '',
    allocations: (r.allocations as any[]) || [],
    sectorAllocations: (r.sector_allocations as any[]) || [],
    movements: (r.movements as any[]) || [],
    threeDim: {
      geography: (r.geography as any[]) || [],
      sectors: (r.sectors as any[]) || [],
      assetClassPro: (r.asset_class_pro as any[]) || [],
    },
    subFunds: (r.sub_funds as any[]) || [],  // ← Cargar sub-fondos
  };
}
```

---

## 3. Lógica de X-Ray Granular (usePortfolio.ts)

### Función: `getXrayByEntity` - Cálculo Ponderado

**Ya implementada correctamente**. El sistema:

1. **Filtra por entidad**: (all, MyInvestor, BBK, Robo-Advisors)
2. **Procesa cada Robo-Advisor**:
   - Si tiene `subFunds`: Usa cada sub-fondo con su `threeDim` proporcional al weight
   - Si NO tiene `subFunds`: Usa el `threeDim` general del Robo-Advisor como fallback
3. **Calcula aportaciones ponderadas**:
   ```typescript
   const sfValue = roboAdvisorTotalValue * (subFundWeight / 100);
   // Luego cada clasificación aporta: sfValue * (componentWeight / 100)
   ```

**Resultado**: X-Ray granular que refleja la composición real de cada sub-fondo.

---

## 4. Componentes de UI Actualizados

### RoboAdvisors.tsx

**Cambios**:
- ✅ Añadido campo `entity` al formulario de creación
- ✅ Campo obligatorio (validación: `if (!form.entity || !form.totalValue) return`)
- ✅ Input con placeholder "MyInvestor, BBK, etc."

**Flujo**:
```
[Nuevo Robo-Advisor]
  ├─ Nombre: "MyInvestor - Cartera Metal"
  ├─ Entidad: "MyInvestor"  ← NUEVO CAMPO
  ├─ Valor actual: 50000
  └─ Valor invertido: 45000

↓ handleSubmit() ↓

onAdd({
  name, entity, totalValue, investedValue, lastUpdated
})
```

### RoboImporter.tsx

**Cambios**:
- ✅ Actualizado tipo Props con `entity` obligatorio
- ✅ Import de MyInvestor.xlsx ahora usa `entity: 'MyInvestor'`

### XRayDashboard.tsx

**Ya implementado correctamente**:
- ✅ SubFundsEditor se abre al pulsar ✏️ en un Robo-Advisor
- ✅ Permite añadir/editar fondos internos (ISIN, Nombre, % peso)
- ✅ Valida que pesos sumen 100%
- ✅ Llamada a `onUpdateRoboSubFunds()` persiste en Supabase

### SubFundsEditor.tsx

**Funcionalidades**:
- ✅ Añadir nuevo sub-fondo (ISIN, nombre, peso)
- ✅ Editar clasificación 3D de cada sub-fondo
- ✅ Eliminar sub-fondos
- ✅ Validación: Pesos deben sumar 100% (tolerancia ±1%)
- ✅ Auto-distribuir pesos equitativamente
- ✅ Integración con ThreeDimEditor para clasificación granular

---

## 5. Flujo de Persistencia Completo

### Crear Robo-Advisor

```
1. Usuario click "Añadir" en RoboAdvisors
2. Rellena: Nombre, Entidad, Valor Actual, Valor Invertido
3. handleSubmit() → onAdd(robo)
4. usePortfolio.addRoboAdvisor()
   └─ roboToRow() → convierte a campos BD
   └─ supabase.from('robo_advisors').insert(...)
5. ✅ RoboAdvisor guardado en Supabase con entity
6. setState() actualiza UI
```

### Agregar Sub-fondos

```
1. User pulsa ✏️ en tabla X-Ray (Robo-Advisor)
2. ThreeDimEditor abre (modal con sub-fondos)
3. Click "+ Añadir Fondo"
4. Rellena ISIN, Nombre, % Peso
5. (Opcional) Click ✏️ para clasificación 3D
6. Click "Guardar"
7. SubFundsEditor.handleSave()
   └─ Valida: sum(pesos) ≈ 100%
   └─ onSave(subFunds)
8. onUpdateRoboSubFunds(roboId, subFunds)
9. usePortfolio.updateRoboSubFunds()
   └─ supabase.from('robo_advisors').update({ sub_funds })
10. ✅ Sub-fondos persistidos en Supabase
11. X-Ray recalcula automáticamente
```

### Editar Clasificación 3D

```
1. Click ✏️ en Robo-Advisor en tabla X-Ray
2. ThreeDimEditor abre
3. Editar geografía, sectores, asset class
4. Click "Guardar"
5. onUpdateRoboThreeDim()
   └─ updateRoboAdvisor() con { threeDim }
   └─ Persiste en Supabase
6. ✅ X-Ray recalcula automáticamente
```

---

## 6. Validación de Sub-fondos

### Reglas Implementadas

```typescript
const handleSave = () => {
  // 1. Filtrar fondos vacíos
  const validFunds = funds.filter(f => f.name.trim());

  // 2. Sumar pesos
  const total = validFunds.reduce((s, f) => s + f.weightPct, 0);

  // 3. Validar suma = 100%
  if (validFunds.length > 0 && Math.abs(total - 100) > 1) {
    toast.error(`Los pesos suman ${total.toFixed(1)}%, deben sumar 100%`);
    return;  // No guardar si no suma 100%
  }

  // 4. Guardar si válido
  onSave(validFunds);
  toast.success('Desglose de fondos guardado');
};
```

**Tolerancia**: ±1% para redondeos (99% a 101% es válido)

---

## 7. Estructura de Datos en Supabase

### Tabla: robo_advisors

```sql
id          uuid NOT NULL PRIMARY KEY
name        text NOT NULL
entity      text NOT NULL  ← Obligatorio (MyInvestor, BBK, etc.)
invested_value  numeric DEFAULT 0
total_value     numeric DEFAULT 0
user_id     uuid NOT NULL FK
sub_funds   jsonb DEFAULT '[]'  ← Array de sub-fondos
geography   jsonb DEFAULT '[]'  ← ThreeDim
sectors     jsonb DEFAULT '[]'
asset_class_pro jsonb DEFAULT '[]'
allocations jsonb DEFAULT '[]'
sector_allocations jsonb DEFAULT '[]'
movements   jsonb DEFAULT '[]'
last_updated text
```

### Estructura de sub_funds

```json
[
  {
    "id": "uuid-1",
    "isin": "ES0000000001",
    "name": "MyInvestor Global Bonds",
    "weightPct": 40,
    "threeDim": {
      "geography": [
        { "name": "Europa", "weight": 60 },
        { "name": "EEUU", "weight": 40 }
      ],
      "sectors": [
        { "name": "Financiero", "weight": 50 },
        { "name": "Otro", "weight": 50 }
      ],
      "assetClassPro": [
        { "name": "RF - Sovereign", "weight": 100 }
      ]
    }
  },
  {
    "id": "uuid-2",
    "isin": "ES0000000002",
    "name": "MyInvestor Global Equity",
    "weightPct": 60,
    "threeDim": { ... }
  }
]
```

---

## 8. Flujo de X-Ray Final

### Con Sub-fondos

```
Robo-Advisor: "MyInvestor - Metal" (Valor: €100k)
├─ Sub-fondo 1: "Global Bonds" (40%)
│  └─ Aportación: €40k
│  └─ Geografía: 60% Europa (€24k), 40% EEUU (€16k)
│  └─ Sectores: 50% Financiero (€20k), 50% Otro (€20k)
├─ Sub-fondo 2: "Global Equity" (60%)
│  └─ Aportación: €60k
│  └─ Geografía: 70% EEUU (€42k), 30% Europa (€18k)
│  └─ Sectores: 40% Tech (€24k), 60% Otro (€36k)

X-RAY CONSOLIDADO:
  Geografía:
    - Europa: €24k + €18k = €42k (42%)
    - EEUU: €16k + €42k = €58k (58%)
  Sectores:
    - Financiero: €20k (20%)
    - Tech: €24k (24%)
    - Otro: €56k (56%)
```

### Sin Sub-fondos (fallback)

```
Robo-Advisor: "Otra Cartera" (Valor: €100k)
├─ NO tiene sub_funds
└─ Usa clasificación general:
   └─ Geografía: 50% Europa, 50% EEUU
   └─ X-RAY: €50k Europa + €50k EEUU
```

---

## 9. Testing Checklist

### ✅ Test 1: Crear Robo-Advisor

```bash
1. Login
2. Pestaña "Robo-Advisors"
3. Click "Añadir"
4. Rellena:
   - Nombre: "Test Robo"
   - Entidad: "MyInvestor"  ← NUEVO
   - Valor actual: 10000
   - Valor invertido: 9000
5. Click "Guardar"
6. ✅ Debe aparecer en tabla
7. F5 (reload)
8. ✅ Debe seguir ahí (Supabase)
```

### ✅ Test 2: Agregar Sub-fondos

```bash
1. Tab X-Ray → filtro "Robo-Advisors"
2. Click ✏️ en el Robo-Advisor creado
3. En SubFundsEditor: Click "+ Añadir Fondo"
4. Rellena:
   - ISIN: "ES00000001"
   - Nombre: "Test Fund 1"
   - Peso: 50
5. Click "+ Añadir Fondo" (segunda)
   - ISIN: "ES00000002"
   - Nombre: "Test Fund 2"
   - Peso: 50
6. Click "Guardar"
7. ✅ Debe mostrar "2 fondos" en X-Ray
8. F5 (reload)
9. ✅ Sub-fondos persisten
```

### ✅ Test 3: Clasificación 3D de Sub-fondos

```bash
1. En SubFundsEditor, click ✏️ en un sub-fondo
2. ThreeDimEditor abre (clasificación de ese sub-fondo)
3. Editar geografía: 60% Europa, 40% EEUU
4. Editar sectores: 50% Tech, 50% Financiero
5. Click "Guardar"
6. ✅ X-Ray debe recalcular con los % ponderados
7. Verificar que "Tech" y "Financiero" aparecen solo
   en la proporción del sub-fondo (50% del peso total)
```

### ✅ Test 4: Validación de Pesos

```bash
1. Agregar 2 sub-fondos con pesos 60% + 30%
2. Click "Guardar"
3. ✅ Error: "Los pesos suman 90%, deben sumar 100%"
4. Cambiar segundo a 40%
5. Click "Guardar"
6. ✅ Se guarda correctamente (suma 100%)
```

### ✅ Test 5: X-Ray Granular

```bash
1. Crear 2 Robo-Advisors:
   - "MyInvestor": 2 sub-fondos (50/50) con diferente geografía
   - "BBK": Sin sub-fondos (fallback a clasificación general)
2. Tab X-Ray → filtro "all"
3. ✅ Geografía debe sumar ponderaciones correctas
4. Tab X-Ray → filtro "Robo-Advisors"
5. ✅ X-Ray solo muestra desglose de los 2 robo-advisors
6. Click ✏️ en "MyInvestor"
7. ✅ SubFundsEditor muestra los 2 fondos creados
```

---

## 10. Errores Comunes y Soluciones

### Error: "Campo 'entity' faltante"

**Causa**: Código intenta crear Robo-Advisor sin entity

**Solución**: Revisar que `handleSubmit` en RoboAdvisors.tsx incluye `entity`:
```typescript
if (!form.entity || !form.totalValue) return;
```

### Error: "Sub-fondos no se guardan"

**Causa**: `updateRoboSubFunds` falla en Supabase

**Diagnóstico**:
1. DevTools → Network
2. Buscar request PATCH `/robo_advisors`
3. Ver response: ¿Error 400/403?
4. Supabase: Verificar que `sub_funds` es jsonb

**Solución**: Revisar RLS en robo_advisors
```sql
-- Debe haber política WITH CHECK en UPDATE
SELECT policyname FROM pg_policies WHERE tablename = 'robo_advisors';
```

### Error: "X-Ray no recalcula después de guardar sub-fondos"

**Causa**: Estado no se actualiza

**Solución**: `updateRoboSubFunds` hace setState() que dispara re-render
```typescript
const updateRoboSubFunds = useCallback(async (id, subFunds) => {
  setState(prev => {
    const newRobos = prev.roboAdvisors.map(r => r.id === id ? { ...r, subFunds } : r);
    // ... actualizar Supabase
    return { ...prev, roboAdvisors: newRobos };  // ← Dispara re-render
  });
}, [user]);
```

### Error: "Pesos no validan correctamente"

**Causa**: Tolerancia de ±1% muy estricta

**Actual**: `Math.abs(total - 100) > 1` (válido: 99-101%)

**Si necesitas cambiar**:
```typescript
// Para tolerancia ±2%:
if (validFunds.length > 0 && Math.abs(total - 100) > 2) { ... }
```

---

## 11. Resumen de Cambios

| Archivo | Cambio | Estado |
|---------|--------|--------|
| types/portfolio.ts | Añadir `entity` a RoboAdvisor | ✅ |
| usePortfolio.ts | Mapear `entity` en roboToRow/rowToRobo | ✅ |
| usePortfolio.ts | Mapear `sub_funds` en roboToRow/rowToRobo | ✅ |
| RoboAdvisors.tsx | Añadir campo entity en formulario | ✅ |
| RoboImporter.tsx | Incluir entity en Props y handleConfirm | ✅ |
| XRayDashboard.tsx | Ya soporta SubFundsEditor (sin cambios) | ✅ |
| SubFundsEditor.tsx | Ya valida pesos (sin cambios) | ✅ |
| usePortfolio.ts (getXrayByEntity) | Ya calcula granular con sub-fondos | ✅ |

---

## 12. Próximos Pasos (Opcionales)

1. **Importar sub-fondos desde Excel**: Modificar myInvestorParser.ts para extraer sub-fondos
2. **Visualización de sub-fondos en tabla principal**: Columna "Sub-fondos" en RoboAdvisors.tsx
3. **Presupuesto de riesgos (Risk Budgeting)**: Por sub-fondo
4. **Backtesting por sub-fondo**: Histórico de X-Ray

---

**Fecha**: 2026-04-04
**Estado**: ✅ PRODUCCIÓN READY
**Build**: ✓ Sin errores
