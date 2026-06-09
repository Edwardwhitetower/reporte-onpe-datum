# Informe ONPE + escenario extranjero Datum

Sitio web estático para visualizar datos oficiales de ONPE y una proyección analítica complementaria basada en un escenario de voto extranjero Datum.

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
- advertencias metodológicas cuando se use fallback departamental;
- escenarios de sensibilidad según distintos porcentajes y volúmenes estimados del voto extranjero.

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

### 3. Escenario extranjero Datum

El voto extranjero se trata por separado:

- los votos extranjeros ya contabilizados por ONPE se respetan tal como están;
- solo el voto extranjero pendiente se estima usando el escenario Datum;
- el escenario Datum utilizado es: **Keiko 62.67% / Sánchez 37.33%**.

De esta forma se evita duplicar votos del extranjero.

```text
Total ajustado =
  Proyección Perú sin extranjero
  + voto extranjero ya contabilizado por ONPE
  + voto extranjero pendiente estimado con Datum
```

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
```

### Descripción de archivos

- `index.html`: estructura principal de la página.
- `style.css`: estilos visuales y diseño responsive.
- `app.js`: renderiza tarjetas, resumen nacional, metodología, tablas, filtros, fallback departamental y escenarios de sensibilidad.
- `data/report-data.json`: archivo principal usado por la página para mostrar los resultados y métricas calculadas.
- `data/regions.csv`: detalle por departamento o región.
- `data/provinces.csv`: detalle por provincia usado para la proyección más desagregada.
- `data/province-errors.csv`: registro de provincias que no pudieron procesarse, si existieran.
- `data/fallback-departments.csv`: registro de departamentos donde se usó respaldo departamental por provincias faltantes.
- `.nojekyll`: evita que GitHub Pages procese el sitio con Jekyll.
- `README.md`: documentación general del proyecto.

## Indicadores mostrados en la web

La página muestra, entre otros datos:

- fecha de corte ONPE;
- porcentaje de actas contabilizadas;
- ventaja actual ONPE;
- ventaja proyectada Perú sin extranjero;
- fuente de proyección usada;
- departamentos con fallback, si existieran;
- voto extranjero ya contabilizado;
- voto extranjero pendiente estimado;
- porcentaje parcial ONPE del extranjero;
- umbral mínimo que Keiko necesita del extranjero pendiente;
- margen del escenario Datum frente al umbral;
- ventaja ajustada con escenario Datum;
- porcentaje ajustado final;
- tabla regional;
- tabla provincial con filtros;
- escenarios de sensibilidad del voto extranjero.

## Sensibilidad del voto extranjero

La tabla de sensibilidad no usa valores arbitrarios fijos. El volumen extranjero base se estima a partir del avance ONPE del extranjero y luego se muestran escenarios alrededor de ese estimado:

```text
Estimado ONPE -20%
Estimado ONPE -10%
Estimado ONPE actual
Estimado ONPE +10%
Estimado ONPE +20%
```

Esto permite evaluar qué ocurre si el volumen final de votos extranjeros termina siendo menor o mayor al estimado actual.

## Criterios metodológicos del modelo híbrido

Un corte con fuente:

```text
provincia
```

significa que todos los departamentos fueron proyectados usando sus provincias completas.

Un corte con fuente:

```text
hibrido_provincia_departamento
```

significa que uno o más departamentos tuvieron provincias faltantes o no procesadas. En esos casos, el modelo usa el total departamental completo como respaldo para evitar una proyección sesgada por omisión.

Esta decisión metodológica prioriza estabilidad y consistencia sobre una desagregación incompleta.

## Advertencia metodológica

Este sitio presenta un escenario analítico no oficial. Los datos oficiales son únicamente los publicados por ONPE y, posteriormente, los validados por JNE.

La proyección puede cambiar entre cortes porque las actas pendientes dentro de una provincia o departamento no necesariamente tienen la misma distribución electoral que las actas ya contabilizadas.

Cuando una provincia no puede procesarse temporalmente, el modelo usa el total departamental como respaldo para evitar sesgos por omisión. Esto mejora la estabilidad del cálculo, pero debe ser leído como una decisión metodológica de respaldo.

Por eso, el informe debe leerse como una **estimación dinámica por corte**, no como una predicción definitiva ni como resultado oficial.

## Estado del proyecto

Proyecto en actualización manual durante el conteo electoral. La versión actual prioriza precisión metodológica mediante un modelo híbrido provincial/departamental, tratamiento separado del voto extranjero y control manual antes de publicar cada corte.
