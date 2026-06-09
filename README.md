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

El informe combina tres componentes:

1. **Datos oficiales ONPE ya contabilizados**  
   Se toman como base los votos y actas contabilizadas publicados por ONPE.

2. **Proyección Perú sin extranjero**  
   La proyección se calcula usando el nivel más desagregado disponible.

   El modelo actual funciona así:

   - si todas las provincias de un departamento cargan correctamente, ese departamento se proyecta a nivel provincial;
   - si una o más provincias de un departamento fallan, el sistema usa el total departamental completo como respaldo;
   - esto evita que una falla temporal de ONPE en algunas provincias distorsione la proyección nacional.

   Por tanto, la fuente de proyección puede ser:

   ```text
   provincia
   ```

   o:

   ```text
   hibrido_provincia_departamento
   ```

3. **Escenario extranjero Datum**  
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
- `data/report-data.json`: archivo principal usado por la página para mostrar todos los resultados.
- `data/regions.csv`: detalle por departamento o región.
- `data/provinces.csv`: detalle por provincia usado para la proyección más desagregada.
- `data/province-errors.csv`: registro de provincias que no pudieron procesarse, si existieran.
- `data/fallback-departments.csv`: registro de departamentos donde se usó respaldo departamental por provincias faltantes.
- `.nojekyll`: evita que GitHub Pages procese el sitio con Jekyll.
- `README.md`: documentación del proyecto.

## Flujo de actualización manual

La actualización de datos se realiza manualmente desde Google Colab para mantener control sobre cada corte antes de publicarlo.

Flujo recomendado:

```text
1. Ejecutar el script de Colab.
2. Verificar el output del corte ONPE.
3. Revisar la fuente de proyección usada.
4. Confirmar si hubo errores provinciales.
5. Si hubo errores, verificar que el modelo haya aplicado fallback departamental.
6. Descargar el ZIP generado por Colab.
7. Subir/reemplazar los archivos de la carpeta data en GitHub.
8. Hacer commit.
9. Esperar la actualización de GitHub Pages.
```

Archivos que normalmente se actualizan con cada nuevo corte:

```text
data/report-data.json
data/regions.csv
data/provinces.csv
data/province-errors.csv
data/fallback-departments.csv
```

Los archivos de interfaz solo se reemplazan cuando se cambia el diseño o la lógica de visualización:

```text
index.html
style.css
app.js
```

## Criterios para publicar un corte

Un corte es ideal cuando aparece:

```text
Fuente proyección Perú: provincia
Errores provincia: 0
Departamentos con fallback: 0
```

También es aceptable publicar un corte cuando aparece:

```text
Fuente proyección Perú: hibrido_provincia_departamento
Departamentos con fallback: 1 o más
```

En ese caso, la proyección sigue siendo válida porque el modelo no omite provincias incompletas: usa el total departamental como respaldo.

No se recomienda publicar si el script termina con error fatal o no genera ZIP.

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

## Advertencia metodológica

Este sitio presenta un escenario analítico no oficial. Los datos oficiales son únicamente los publicados por ONPE y, posteriormente, los validados por JNE.

La proyección puede cambiar entre cortes porque las actas pendientes dentro de una provincia o departamento no necesariamente tienen la misma distribución electoral que las actas ya contabilizadas.

Cuando una provincia no puede procesarse temporalmente, el modelo usa el total departamental como respaldo para evitar sesgos por omisión. Esto mejora la estabilidad del cálculo, pero debe ser leído como una decisión metodológica de respaldo.

Por eso, el informe debe leerse como una **estimación dinámica por corte**, no como una predicción definitiva ni como resultado oficial.

## Notas sobre GitHub Pages

Después de subir nuevos archivos y hacer commit, GitHub Pages puede tardar algunos minutos en mostrar la versión actualizada. Si la página no cambia de inmediato, se recomienda:

- revisar que el commit se haya completado;
- abrir la página en modo incógnito;
- agregar un parámetro temporal a la URL, por ejemplo:

```text
https://edwardwhitetower.github.io/reporte-onpe-datum/?v=0715
```

## Estado del proyecto

Proyecto en actualización manual durante el conteo electoral. La versión actual prioriza precisión metodológica mediante un modelo híbrido provincial/departamental, tratamiento separado del voto extranjero y control manual antes de publicar cada corte.
