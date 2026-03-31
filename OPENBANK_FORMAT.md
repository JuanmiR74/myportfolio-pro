# Formato de Importación Openbank

## Estado Actual de Cartera

El importador de Openbank está diseñado para procesar archivos Excel (.xlsx) que contengan el estado actual de la cartera de fondos.

### Columnas Requeridas

El archivo debe contener las siguientes columnas (el orden no importa):

- **FONDO**: Nombre del fondo de inversión
- **ISIN**: Código ISIN del fondo
- **PARTICIP**: Número de participaciones

### Columnas Opcionales

- **PRECIO MEDIO**: Precio medio de compra por participación (usado para calcular el capital invertido)
- **VALOR ACTUAL**: Valor actual de mercado total de la posición
- **RENTABILIDAD**: Ganancia/Pérdida total de la posición

### Cálculos Automáticos

Si no se proporcionan todas las columnas opcionales, el sistema calculará:

1. **Capital Invertido** = PARTICIP × PRECIO MEDIO
2. **Valor Actual** = Si está en la columna, se usa; si no, se iguala al capital invertido
3. **Rentabilidad** = Si está en la columna, se usa; si no, se calcula como Valor Actual - Capital Invertido

### Ejemplo de Estructura

```
FONDO                          | ISIN         | PARTICIP | PRECIO MEDIO | VALOR ACTUAL | RENTABILIDAD
Fidelity MSCI Europe          | LU0389812347 | 62.50    | 16.20       | 1025.50      | 12.50
Vanguard US 500               | IE0032620787 | 38.75    | 25.80       | 1050.00      | 50.25
BGF World Healthscience       | LU0171307068 | 18.00    | 54.00       | 1014.00      | 42.00
```

### Comportamiento de Importación

El importador funciona como **snapshot** (foto actual):

1. **Fondos Nuevos**: Si el ISIN no existe en la base de datos, se crea como nuevo "Fondo Individual" bajo la categoría "Fondos BBK"

2. **Fondos Existentes**: Si el ISIN ya existe, se actualizan:
   - Número de participaciones
   - Precio actual de mercado
   - Precio medio de compra
   - Clasificación automática (si se detecta por nombre/ISIN)

3. **Clasificación Automática**: El sistema usa el diccionario de inteligencia compartido con MyInvestor para asignar:
   - Tipo de activo (Renta Variable, Renta Fija, etc.)
   - Región/Sector (EEUU, Europa, Emergentes, etc.)

### Diccionario de Patrones Reconocidos

El sistema reconoce automáticamente estos fondos por nombre o ISIN:

- **S&P 500 / US Index**: Fondos indexados al S&P 500 → EEUU 100%
- **MSCI Europe**: Fondos de renta variable europea → Europa 100%
- **Mercados Emergentes**: Fondos de países emergentes → Emergentes 100%
- **MSCI Japan**: Fondos japoneses → Global 100%
- **Global / Developed World**: Fondos globales → EEUU 50%, Europa 30%, Global 20%

### Integración con X-Ray

Los datos importados se integran automáticamente en el análisis X-Ray:

- La distribución por tipo de activo se actualiza
- La exposición geográfica y sectorial se recalcula
- Los fondos nuevos aparecen en la tabla de "Activos Desglosados"
- Se puede filtrar por entidad (BBK) para ver solo fondos de Openbank

### Notas Importantes

1. El formato debe tener una fila de cabecera con los nombres de las columnas
2. Los nombres de las columnas no son case-sensitive (FONDO = fondo = Fondo)
3. Los valores numéricos pueden tener separadores de miles y decimales (se normalizan automáticamente)
4. Si un fondo no se reconoce automáticamente, se puede clasificar manualmente desde la pestaña "X-Ray → Ficha de Fondos"
