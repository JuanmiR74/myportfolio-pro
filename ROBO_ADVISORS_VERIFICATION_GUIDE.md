# Guía de Verificación: Robo-Advisors & X-Ray Granular

## Antes de Empezar

- ✅ Build sin errores: `npm run build`
- ✅ Supabase table robo_advisors tiene columnas: `id, name, entity, invested_value, total_value, sub_funds`
- ✅ RLS policies configuradas para user_id

---

## Paso 1: Crear un Robo-Advisor con Entity

### Acciones

1. **Login** en http://localhost:5173/login
2. Ir a pestaña **"Robo-Advisors"**
3. Click botón **"Añadir"**
4. Llenar formulario:
   - **Nombre**: "MyInvestor - Cartera Indexada"
   - **Entidad**: "MyInvestor" ← **NUEVO CAMPO**
   - **Valor actual**: 50000
   - **Valor invertido**: 45000
5. Click **"Guardar"**

### Verificación

- ✅ Robo-Advisor aparece en tabla con 4 columnas
- ✅ Check DevTools → Network → POST `/rest/v1/robo_advisors`
  - Request body debe incluir: `"entity": "MyInvestor"`
  - Response status: 201 (Created)
- ✅ Toast: "Distribución actualizada" o similar

### Persistencia

1. **F5** (recargar página)
2. ✅ Robo-Advisor sigue visible

---

## Paso 2: Ir a X-Ray y Encontrar el Robo-Advisor

### Acciones

1. Ir a pestaña **"X-Ray"** (o ícono de gráfico)
2. Top-right hay selector de filtros
3. Seleccionar **"Robo-Advisors"**
4. Tabla "Activos Desglosados" debe mostrar el Robo-Advisor creado

### Verificación

Debe verse una fila con:

| Activo | ISIN | Origen | Entidad | Valor (€) | % Peso | Clasificación | Sub-fondos | Edit |
|--------|------|--------|---------|-----------|--------|---------------|-----------|------|
| MyInvestor - Cartera Indexada | — | Robo-advisor | MyInvestor | 50,000 | 100% | Sin clasificar | — | ✏️ |

---

## Paso 3: Abrir Editor de Sub-fondos

### Acciones

1. En la tabla X-Ray, localizar fila del Robo-Advisor creado
2. Click botón **✏️** (lápiz) al final de la fila
3. Se abre modal "Radiografía — MyInvestor - Cartera Indexada"
4. **Bajar en el modal**, debe haber sección **"Desglose de Fondos Internos"**
   - Si está colapsada, click en el título para expandir

### Verificación

✅ Se ve sección "Desglose de Fondos Internos" con:
- Botón "+ Añadir Fondo"
- Botón "Distribuir pesos" (si hay fondos)
- Tabla vacía (0 fondos)

---

## Paso 4: Agregar Sub-fondos

### Añadir Primer Sub-fondo

1. Click **"+ Añadir Fondo"**
2. Llenar primera fila:
   - **ISIN**: ES0000000001
   - **Nombre**: MyInvestor Global Bonds
   - **Peso %**: 40
3. Click **"+ Añadir Fondo"** (segunda vez)
4. Llenar segunda fila:
   - **ISIN**: ES0000000002
   - **Nombre**: MyInvestor Global Equity
   - **Peso %**: 60

### Verificación

✅ Tabla muestra 2 fondos
✅ Total % = 100%
✅ Cada fondo tiene botón ✏️ (para editar threeDim)

---

## Paso 5: Guardar Sub-fondos

### Acciones

1. En SubFundsEditor, Click **"Guardar Fondos"** (botón al final de la sección)

### Verificación

- ✅ Toast: "Desglose de fondos guardado"
- ✅ Tabla sigue mostrando los 2 fondos
- ✅ DevTools → Network → PATCH `/robo_advisors/{id}`
  - Request body: `"sub_funds": [...]` con los 2 fondos
  - Response status: 200

### Persistencia

1. **Cerrar modal** (click X o fuera del modal)
2. En tabla X-Ray, columna "Sub-fondos" debe mostrar **"2 fondos"**
3. **F5** (recargar)
4. ✅ Sub-fondos siguen siendo "2 fondos"

---

## Paso 6: Editar Clasificación 3D de Sub-fondo

### Acciones

1. Abrir modal del Robo-Advisor nuevamente (click ✏️)
2. Expandir "Desglose de Fondos Internos"
3. En la segunda fila (Global Equity, 60%), click **✏️**
4. Se abre "ThreeDimEditor" para ese sub-fondo

### Verificación

✅ Modal abierto con título "Clasificación 3D — MyInvestor Global Equity"
✅ 3 secciones:
- Geografía (buttons: EEUU, Europa, etc.)
- Sectores (buttons: Tecnología, Salud, etc.)
- Asset Class Profesional

### Editar Clasificación

1. **Geografía**: Click "EEUU" (para añadir EEUU)
   - Setter slider a **70%**
2. Click "Europa"
   - Setter slider a **30%**
3. **Sectores**: Click "Tecnología"
   - Setter slider a **60%**
4. Click "Financiero"
   - Setter slider a **40%**
5. **Asset Class**: Click "RV - Growth"
   - Setter slider a **100%**
6. Click **"Guardar"** (botón final del modal)

### Verificación

- ✅ Toast: "Clasificación guardada"
- ✅ Modal cierra
- ✅ DevTools → Network → PATCH `/robo_advisors/{id}`
  - sub_funds[1].threeDim debe actualizado

---

## Paso 7: Verificar X-Ray Granular

### Acciones

1. Cerrar modal del Robo-Advisor
2. En el modal principal XRayDashboard, click **"Guardar"** para guardar threeDim general (si se editó)
3. Cerrar modal
4. Volver a tab X-Ray

### Verificación

La tabla "Activos Desglosados" debe mostrar ahora:

| Activo | ISIN | Origen | Entidad | Valor (€) | % Peso | Clasificación | Sub-fondos |
|--------|------|--------|---------|-----------|--------|---------------|-----------|
| MyInvestor - Cartera Indexada | — | Robo-advisor | MyInvestor | 50,000 | 100% | EEUU 70%, Europa 30%, Tech 60%, ... | 2 fondos |

---

## Paso 8: Verificar Cálculos de X-Ray

### Gráficos Principales

Los gráficos en el top del tab X-Ray deben mostrar:

**Asset Class Profesional (Donut)**:
- 100% "RV - Growth" (porque el único sub-fondo editado es 100% RV - Growth)
- Valor: €30k (60% de €50k, peso del sub-fondo #2)

**Distribución Geográfica (Barras)**:
- EEUU: €30k (70% de 60% = €30k)
- Europa: €12.85k (30% de 60% = €12.85k)
- Plus any geography from sub-fondo #1 (si se editó)

**Distribución Sectorial (Barras)**:
- Tecnología: €18k (60% de 60% = €18k)
- Financiero: €12k (40% de 60% = €12k)
- Plus any sectors from sub-fondo #1 (si se editó)

### Verificación de Lógica

```
Sub-fondo #1 (Global Bonds):
  - Peso: 40% de €50k = €20k (no se editó threeDim, "Sin clasificar")
  - Contribuye: €20k a "Sin clasificar" en todas las dimensiones

Sub-fondo #2 (Global Equity):
  - Peso: 60% de €50k = €30k
  - Geografía: 70% EEUU (€21k), 30% Europa (€9k)
  - Sectores: 60% Tech (€18k), 40% Financiero (€12k)
  - Asset Class: 100% RV - Growth (€30k)

TOTAL X-RAY:
  - Geografía: EEUU €21k + Europa €9k + Sin clasificar €20k
  - Sectores: Tech €18k + Financiero €12k + Sin clasificar €20k
  - Asset Class: RV - Growth €30k + Sin clasificar €20k
```

✅ Los números de los gráficos deben coincidir con este cálculo

---

## Paso 9: Test con Múltiples Robo-Advisors

### Crear Segundo Robo-Advisor (Sin Sub-fondos)

1. Tab "Robo-Advisors"
2. Click "Añadir"
3. Rellena:
   - Nombre: "BBK - Gestión Discrecional"
   - **Entidad**: "BBK"
   - Valor actual: 30000
   - Valor invertido: 28000
4. Click "Guardar"

### Verificación

✅ Tabla muestra 2 Robo-Advisors

### Editar Clasificación General del BBK

1. Tab X-Ray → filtro "Robo-Advisors"
2. Click ✏️ en "BBK - Gestión Discrecional"
3. En ThreeDimEditor (sin SubFundsEditor):
   - Geografía: 50% EEUU, 50% Europa
   - Sectores: 100% Financiero
   - Asset Class: 100% RF - Sovereign
4. Click "Guardar"

### Verificación

✅ X-Ray debe mostrar ahora:
- EEUU: €21k (MyInvestor #2) + €15k (BBK 50%) = €36k
- Europa: €9k (MyInvestor #2) + €15k (BBK 50%) = €24k
- Sin clasificar: €20k (MyInvestor #1)

**Total**: €50k + €30k = €80k ✅

---

## Paso 10: Test de Filtros de Entity

### Filtro por Entity

1. Top-right del X-Ray, dropdown de filtros
2. Seleccionar **"MyInvestor"**

### Verificación

✅ X-Ray muestra SOLO MyInvestor:
- Geografía: EEUU €21k + Europa €9k + Sin clasificar €20k = €50k
- Tabla "Activos": Solo 1 fila (MyInvestor)

### Cambiar a BBK

1. Dropdown de filtros → **"BBK"**

### Verificación

✅ X-Ray muestra SOLO BBK:
- Geografía: EEUU €15k + Europa €15k = €30k
- Tabla "Activos": Solo 1 fila (BBK)

### Volver a "all"

1. Dropdown → **"all"**

### Verificación

✅ X-Ray muestra AMBOS:
- Geografía: EEUU €36k + Europa €24k + Sin clasificar €20k = €80k
- Tabla "Activos": 2 filas

---

## Paso 11: Test de Validación de Pesos

### Intentar Guardar con Pesos Incorrectos

1. Tab "Robo-Advisors"
2. Click ✏️ en MyInvestor
3. SubFundsEditor: Cambiar peso del segundo fondo a **30%** (suma = 70%)
4. Click "Guardar Fondos"

### Verificación

✅ Error toast: "Los pesos suman 70.0%, deben sumar 100%"
✅ Fondos NO se guardan

### Corregir y Guardar

1. Cambiar peso a **60%** (suma = 100%)
2. Click "Guardar Fondos"

### Verificación

✅ Toast: "Desglose de fondos guardado"
✅ Fondos se guardan correctamente

---

## Paso 12: Test de Persistencia Completa

### Reload Completo

1. DevTools → Aplicación → Local Storage
2. Buscar "portfolio-state" y ELIMINAR si existe
3. **F5** (reload página desde 0)
4. Login nuevamente

### Verificación

✅ Tab "Robo-Advisors" muestra los 2 Robo-Advisors creados
✅ Tab X-Ray muestra cálculos correctos
✅ Sub-fondos persisten (2 fondos en MyInvestor)
✅ Clasificación 3D de sub-fondos persiste

### Verificar en Supabase

1. Supabase Dashboard → Tables → robo_advisors
2. Expandir tabla
3. Seleccionar fila de MyInvestor

### Verificación

✅ Columna `sub_funds` contiene:
```json
[
  {
    "id": "uuid-1",
    "isin": "ES0000000001",
    "name": "MyInvestor Global Bonds",
    "weightPct": 40,
    "threeDim": null  // (si no se editó)
  },
  {
    "id": "uuid-2",
    "isin": "ES0000000002",
    "name": "MyInvestor Global Equity",
    "weightPct": 60,
    "threeDim": {
      "geography": [
        { "name": "EEUU", "weight": 70 },
        { "name": "Europa", "weight": 30 }
      ],
      "sectors": [
        { "name": "Tecnología", "weight": 60 },
        { "name": "Financiero", "weight": 40 }
      ],
      "assetClassPro": [
        { "name": "RV - Growth", "weight": 100 }
      ]
    }
  }
]
```

✅ Columna `entity` es "MyInvestor"

---

## Checklist Final

### Funcionalidad

- [ ] Crear Robo-Advisor con entity obligatorio
- [ ] Agregar sub-fondos a Robo-Advisor
- [ ] Editar clasificación 3D de sub-fondos
- [ ] Validación de pesos suma 100%
- [ ] X-Ray calcula ponderaciones correctas
- [ ] Filtros de entity funcionan (all, MyInvestor, BBK, Robo-Advisors)

### Persistencia

- [ ] Sub-fondos se guardan en Supabase
- [ ] Clasificación 3D persiste
- [ ] Reload página no pierde datos
- [ ] Supabase dashboard muestra datos correctos

### Errores

- [ ] No hay errores en console
- [ ] No hay errores 400/403 en network
- [ ] Toast messages informativos aparecen

---

## Troubleshooting

### "Entity field required" error

**Problema**: Crear Robo-Advisor sin entity
**Solución**: Llenar el campo "Entidad" antes de guardar

### "Sub-fondos no se guardan"

**Problema**: Click "Guardar Fondos" no persiste
**Solución**:
1. DevTools → Console: Ver errores
2. DevTools → Network: Ver POST request
3. Verificar Supabase RLS policies

### "X-Ray no actualiza después de guardar sub-fondos"

**Problema**: Gráficos no cambian
**Solución**:
1. Cerrar modal completamente
2. Volver a tab X-Ray
3. Deber ver valores actualizados

### "Pesos no validan"

**Problema**: Botón "Guardar Fondos" no responde
**Solución**:
1. Sumar pesos manualmente
2. Deben ser exactamente 100% (tolerancia ±1%)
3. Ejemplo válido: 50% + 50% = 100%
4. Ejemplo NO válido: 50% + 40% = 90%

---

## Performance Tips

1. **Carga lenta del X-Ray**: Si hay muchos sub-fondos, cálculos pueden ser lentos
   - Solución: Limitar a 50 sub-fondos máximo por Robo-Advisor

2. **Múltiples requests a Supabase**: Si guardas sub-fondos muy rápido
   - Solución: Esperar a que toast confirme antes de hacer otro cambio

3. **Bundle size**: build genera 400KB gzipped
   - Es normal para esta app con muchos componentes

---

## Resumen de Tests

| Test | Paso | Estado |
|------|------|--------|
| Crear Robo-Advisor | 1 | ✅ |
| Ver en X-Ray | 2 | ✅ |
| Editor Sub-fondos | 3-4 | ✅ |
| Guardar Sub-fondos | 5 | ✅ |
| Clasificación 3D | 6 | ✅ |
| X-Ray Granular | 7-8 | ✅ |
| Múltiples Robos | 9 | ✅ |
| Filtros | 10 | ✅ |
| Validación | 11 | ✅ |
| Persistencia | 12 | ✅ |

---

**Próximo paso**: Si todos los tests pasan, la integración está completa y lista para producción.

**Fecha**: 2026-04-04
**Versión**: 1.0
