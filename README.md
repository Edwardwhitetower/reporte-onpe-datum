# Informe ONPE + escenario extranjero Datum

Sitio web estático para visualizar datos oficiales de ONPE y una proyección analítica complementaria basada en un escenario de voto extranjero Datum mientras exista voto extranjero pendiente.

> **Importante:** este proyecto no reemplaza los resultados oficiales de ONPE/JNE. La página muestra una estimación dinámica por corte, útil para análisis, pero no constituye proclamación oficial.

## Sitio publicado

```text
https://edwardwhitetower.github.io/reporte-onpe-datum/
```

## Objetivo del proyecto

El objetivo es presentar, de forma clara y verificable:

- el avance oficial del conteo publicado por ONPE;
- la ventaja actual entre candidatos;
- una proyección nacional sin voto extranjero;
- una proyección ajustada incorporando el voto extranjero;
- una tabla regional y provincial para revisar dónde se concentra la variación del conteo;
- una prueba de sensibilidad del volumen extranjero mientras exista voto extranjero pendiente;
- un historial de cortes válidos para auditar la evolución del análisis.

## Metodología resumida

El informe combina tres componentes principales:

### 1. Datos oficiales ONPE ya contabilizados

Se toman como base los votos y actas contabilizadas publicados por ONPE.

### 2. Proyección Perú sin extranjero

La proyección se calcula usando el nivel más desagregado disponible.

El modelo actual funciona así:

- si todas las provincias de un departamento cargan correctamente, ese departamento se proyecta a nivel provincial;
- si una o más provincias de un departamento fallan, el sistema usa el total departamental completo como respaldo;
- esto evita que una falla temporal en la carga de provincias distorsione la proyección nacional por omisión de territorios completos o parciales.

Por tanto, la fuente de proyección puede ser:

```text
provincia
```

o:

```text
hibrido_provincia_departamento
```

### 3. Voto extranjero

Mientras exista voto extranjero pendiente, el informe usa un método mixto:

- los votos extranjeros ya contabilizados por ONPE se respetan tal como están;
- solo el voto extranjero pendiente se estima usando el escenario Datum;
- el escenario Datum utilizado es: **Keiko 62.67% / Sánchez 37.33%**.

Cuando el voto extranjero quede contabilizado por ONPE, el cálculo principal deja de usar Datum y pasa a usar solo el voto extranjero oficial ONPE.

## Prueba de sensibilidad del volumen extranjero

Mientras exista voto extranjero pendiente, la página muestra una prueba de sensibilidad con variaciones del volumen estimado de votos extranjeros válidos.

Estos escenarios no son pronósticos independientes. Su objetivo es medir la robustez del resultado si el volumen final de votos extranjeros termina por debajo o por encima del estimado actual.

La tabla usa escenarios como:

```text
Estimado ONPE -20%
Estimado ONPE -10%
Estimado ONPE actual
Estimado ONPE +10%
Estimado ONPE +20%
```

Esto permite evaluar si el resultado depende de un volumen extranjero muy preciso o si se mantiene estable incluso con variaciones razonables del estimado.


```text
Mientras hay extranjero pendiente:
  Proyección Perú sin extranjero
  + voto extranjero ONPE ya contabilizado
  + voto extranjero pendiente estimado con Datum

Cuando el extranjero está cerrado:
  Proyección Perú sin extranjero
  + voto extranjero oficial ONPE
```

## Historial de cortes

El archivo `data/history.json` conserva un resumen de los cortes válidos. Solo se incluyen cortes que pasaron validación técnica y generaron ZIP de datos. Los intentos bloqueados por preflight no se registran como resultados.

## Archivos principales

```text
index.html
style.css
app.js
README.md
.nojekyll
data/report-data.json
data/regions.csv
data/provinces.csv
data/province-errors.csv
data/fallback-departments.csv
data/history.json
```

### Descripción de archivos

- `index.html`: estructura principal de la página.
- `style.css`: estilos visuales y diseño responsive.
- `app.js`: renderiza tarjetas, resumen nacional, metodología, historial, tablas, filtros, fallback departamental y prueba de sensibilidad del volumen extranjero.
- `data/report-data.json`: archivo principal usado por la página para mostrar los resultados y métricas calculadas.
- `data/regions.csv`: detalle por departamento o región.
- `data/provinces.csv`: detalle por provincia usado para la proyección más desagregada.
- `data/province-errors.csv`: registro de provincias que no pudieron procesarse, si existieran.
- `data/fallback-departments.csv`: registro de departamentos donde se usó respaldo departamental por provincias faltantes.
- `data/history.json`: historial resumido de cortes válidos.
- `.nojekyll`: evita que GitHub Pages procese el sitio con Jekyll.
- `README.md`: documentación general del proyecto.

## Advertencia metodológica

Este sitio presenta un escenario analítico no oficial. Los datos oficiales son únicamente los publicados por ONPE y, posteriormente, los validados por JNE.

La proyección puede cambiar entre cortes porque las actas pendientes dentro de una provincia o departamento no necesariamente tienen la misma distribución electoral que las actas ya contabilizadas.

Cuando una provincia no puede procesarse temporalmente, el modelo usa el total departamental como respaldo para evitar sesgos por omisión. Esto mejora la estabilidad del cálculo, pero debe ser leído como una decisión metodológica de respaldo.

Por eso, el informe debe leerse como una **estimación dinámica por corte**, no como una predicción definitiva ni como resultado oficial.
