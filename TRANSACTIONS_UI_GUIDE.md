# Guía Visual del Sistema de Transacciones

## Cambios en la Interfaz

### Antes (Campo Aportado Editable)

```
┌─────────────────────────────────────────────────────────────────┐
│ Fondos de Inversión                                    [Filtro] │
├─────────────────────────────────────────────────────────────────┤
│
│  Inversión Real: 50,000 EUR  │  Valor Actual: 52,500 EUR  │  Plusvalía: +2,500 EUR
│
├────────────────┬──────┬──────────┬──────┬────────┬──────────┬──────────────┬──────┤
│ Fondo / ISIN   │ Ent. │ APORTADO │ Uds. │ Precio │ Valor    │ Rentabilidad │ Acc. │
├────────────────┼──────┼──────────┼──────┼────────┼──────────┼──────────────┼──────┤
│ Fidelity MSCI  │ BBK  │ [5000]   │ 38   │ 27,50  │ 1,045 €  │ +45 € / +1%  │ ✎ 🗑 │
│ World          │      │          │      │        │          │              │      │
│ IE00BYX5NX33   │      │          │      │        │          │              │      │
└────────────────┴──────┴──────────┴──────┴────────┴──────────┴──────────────┴──────┘

✗ El campo "APORTADO" era editable directamente en la tabla
✗ No había historial de movimientos
✗ Difícil hacer seguimiento de cambios
```

### Después (Campo Aportado Calculado + Historial)

```
┌─────────────────────────────────────────────────────────────────┐
│ Fondos de Inversión                                    [Filtro] │
├─────────────────────────────────────────────────────────────────┤
│
│  Inversión Real: 50,000 EUR  │  Valor Actual: 52,500 EUR  │  Plusvalía: +2,500 EUR
│
├────────────────┬──────┬──────────┬──────┬────────┬──────────┬──────────────┬──────┤
│ Fondo / ISIN   │ Ent. │ APORTADO │ Uds. │ Precio │ Valor    │ Rentabilidad │ Acc. │
├────────────────┼──────┼──────────┼──────┼────────┼──────────┼──────────────┼──────┤
│ Fidelity MSCI  │ BBK  │ 5000 €   │ 38   │ 27,50  │ 1,045 €  │ +45 € / +1%  │ 🕐✎🗑│
│ World          │      │ (READ)   │      │        │          │              │      │
│ IE00BYX5NX33   │      │          │      │        │          │              │      │
└────────────────┴──────┴──────────┴──────┴────────┴──────────┴──────────────┴──────┘

✓ Campo APORTADO es READ-ONLY (no editable)
✓ Botón 🕐 para ver/gestionar historial de movimientos
✓ Valor calculado automáticamente desde transacciones
✓ Mantiene botones de editar (✎) y eliminar (🗑) para otros campos
```

---

## Interacción: Abrir Historial

### Paso 1: Click en botón Historial (🕐)

```
Usuario en tabla de Fondos
         ↓
   Click en 🕐
         ↓
   Se abre diálogo modal
```

### Paso 2: Diálogo de Historial

```
┌─────────────────────────────────────────────────────┐
│ Historial de Movimientos                        × │
├─────────────────────────────────────────────────────┤
│
│  Capital invertido (de transacciones)
│  € 5,000.00                    [+ Agregar Movimiento]
│
│  ┌─────────────────────────────────────────────────┐
│  │ Fecha      │ Importe        │ Descripción      │ 🗑 │
│  ├─────────────────────────────────────────────────┤
│  │ 2026-04-02 │ +5,000.00 EUR  │ Aportación ini.  │ 🗑 │
│  │ 2026-03-15 │ +3,000.00 EUR  │ Aportación adic. │ 🗑 │
│  │ 2026-02-20 │ -1,000.00 EUR  │ Retirada parcial │ 🗑 │
│  └─────────────────────────────────────────────────┘
│
│  [Cancelar]                              [Guardar]
│
└─────────────────────────────────────────────────────┘

✓ Muestra todas las transacciones
✓ Total calculado automáticamente (5000 + 3000 - 1000 = 7000)
✓ Cada transacción tiene fecha, importe, descripción
✓ Código de colores: + = verde (aportación), - = rojo (retirada)
✓ Botón para eliminar cada movimiento
✓ Botón para agregar nuevo movimiento
```

### Paso 3: Click en "Agregar Movimiento"

```
┌──────────────────────────────────────────┐
│ Agregar Movimiento                   × │
├──────────────────────────────────────────┤
│
│ Importe (EUR)
│ [_________.__ ]
│ ℹ Positivo para aportación, negativo para retirada
│
│ Fecha
│ [2026-04-02_]
│
│ Descripción (opcional)
│ [Ej: Aportación inicial, retirada parcial...]
│
│ [Cancelar]                  [Guardar]
│
└──────────────────────────────────────────┘

Usuario puede:
✓ Ingresar importe positivo (+5000) para aportación
✓ Ingresar importe negativo (-1000) para retirada
✓ Seleccionar fecha del movimiento
✓ Agregar descripción (opcional pero recomendada)
```

### Paso 4: Después de Guardar

```
Transacción insertada en BD (transacciones)
         ↓
TransactionHistory recalcula total
         ↓
onInvestedChanged callback dispara
         ↓
FundsTable actualiza investedAmounts[assetId]
         ↓
Campo "Aportado" se actualiza en la tabla principal
         ↓
Valores re-calculados:
- Aportado: ahora suma de todas las transacciones
- Rentabilidad: nuevo Valor Actual - nuevo Aportado
- Total tabla: suma de todos los Aportado recalculados
```

---

## Casos de Uso

### Caso 1: Usuario Nuevo - Aportación Inicial

```
Flujo:
1. Usuario añade fondo: "Fidelity MSCI World"
   - Total Invertido: 0 (por defecto)
   - Participaciones: 50
   - Precio Actual: 25 EUR

2. Click en 🕐 (Historial)

3. Agrega transacción:
   - Importe: 5000 EUR
   - Fecha: 2026-04-02
   - Descripción: "Aportación inicial"

4. Resultado:
   - Campo Aportado = 5000 EUR
   - Valor Actual = 50 * 25 = 1,250 EUR
   - Rentabilidad = 1,250 - 5,000 = -3,750 EUR (pérdida)
```

### Caso 2: Usuario Existente - Agregar Aportación

```
Estado previo:
- Aportado = 5,000 EUR (de transacción anterior)
- Valor Actual = 5,500 EUR (1,100 partic. * 5 EUR)

Nuevo movimiento:
- Agregar: +2,000 EUR
- Fecha: 2026-04-02
- Descripción: "Aportación adicional"

Resultado:
- Aportado = 7,000 EUR (5,000 + 2,000)
- Rentabilidad = 5,500 - 7,000 = -1,500 EUR
```

### Caso 3: Usuario Retira Fondos

```
Estado previo:
- Aportado = 10,000 EUR
- Valor Actual = 12,000 EUR (ganancia)
- Participaciones: 1000

Usuario retira 500 participaciones (vende mitad):
- Agregar transacción: -5,000 EUR (mitad de aportado)
- Fecha: 2026-04-02
- Descripción: "Retirada parcial - venta 500 partic."

Resultado:
- Aportado = 5,000 EUR (10,000 - 5,000)
- Participaciones = 500 (mantiene)
- Valor Actual = 6,000 EUR (500 * 12 EUR)
- Rentabilidad = 6,000 - 5,000 = +1,000 EUR
```

---

## Cambios en los Campos

### Campo: Aportado

| Antes | Después |
|-------|---------|
| Editable directamente en tabla | Read-only en tabla |
| Ingreso manual | Calculado de transacciones |
| Sin historial | Historial completo auditable |
| Valor estático | Valor dinámico |

### Nuevos Elementos

| Elemento | Dónde | Función |
|----------|-------|---------|
| 🕐 Botón | Última columna de cada fonda | Abre diálogo de transacciones |
| Dialog de Transacciones | Modal superpuesto | Gestiona movimientos de un activo |
| Tabla de Transacciones | Dentro del dialog | Muestra historial con fechas |
| Botón "+ Agregar" | Dentro del dialog | Abre sub-diálogo para nuevo movimiento |

---

## Impacto en Cálculos

### Antes
```
Rentabilidad = Valor Actual - Aportado (editable)
               └─> Puede no coincidir con inversión real
               └─> Requiere actualización manual
               └─> Sin auditoría
```

### Después
```
Rentabilidad = Valor Actual - Aportado (calculado)
               └─> Suma precisa de all transacciones
               └─> Se actualiza automáticamente
               └─> Historial completo auditable
               └─> Coherente con eventos reales
```

---

## Flujo de Datos

```
┌──────────────────┐
│  Usuario Aporta  │
│    +5000 EUR     │
└────────┬─────────┘
         │
         ▼
    ┌─────────────────────┐
    │ useTransactions()    │
    │ .addTransaction()    │
    └────────┬────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Supabase: transactions   │
    │ INSERT new transaction   │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ TransactionHistory       │
    │ Recalcula total          │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ onInvestedChanged()      │
    │ Propaga cambio           │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ FundsTable               │
    │ Actualiza investedAmounts│
    │ Re-renderiza             │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Usuario ve nuevo valor   │
    │ "Aportado: 5000 EUR"     │
    └──────────────────────────┘
```

---

## Notas Importantes

1. **Sincronización**: Todo cambio se sincroniza inmediatamente con Supabase
2. **Offline**: Si hay conexión offline, se muestra error con toast
3. **Confirmación**: Eliminar una transacción pide confirmación
4. **Cálculos**: El total de la tabla se recalcula en tiempo real
5. **Historial**: Cada transacción es auditable (quién, cuándo, qué)

---

**Última actualización**: 2026-04-02
