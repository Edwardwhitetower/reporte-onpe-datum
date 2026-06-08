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
- escenarios de sensibilidad según distintos porcentajes del voto extranjero.

## Metodología resumida

El informe combina tres componentes:

1. **Datos oficiales ONPE ya contabilizados**  
   Se toman como base los votos y actas contabilizadas publicados por ONPE.

2. **Proyección Perú sin extranjero**  
   La proyección se calcula de forma lineal usando el nivel más desagregado disponible. Actualmente el modelo usa **nivel provincial** cuando los datos están disponibles. Si la descarga provincial fallara, el sistema puede volver a una proyección por departamento como respaldo.

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
```

### Descripción de archivos

- `index.html`: estructura principal de la página.
- `style.css`: estilos visuales y diseño responsive.
- `app.js`: renderiza tarjetas, resumen nacional, metodología, tablas, filtros y escenarios de sensibilidad.
- `data/report-data.json`: archivo principal usado por la página para mostrar todos los resultados.
- `data/regions.csv`: detalle por departamento o región.
- `data/provinces.csv`: detalle por provincia usado para la proyección más desagregada.
- `data/province-errors.csv`: registro de provincias que no pudieron procesarse, si existieran.
- `.nojekyll`: evita que GitHub Pages procese el sitio con Jekyll.
- `README.md`: documentación del proyecto.

## Flujo de actualización manual

La actualización de datos se realiza manualmente desde Google Colab para mantener control sobre cada corte antes de publicarlo.

Flujo recomendado:

```text
1. Ejecutar el notebook de Colab.
2. Verificar el output del corte ONPE.
3. Confirmar que la proyección use nivel provincia.
4. Descargar el ZIP generado por Colab.
5. Subir/reemplazar los archivos de la carpeta data en GitHub.
6. Hacer commit.
7. Esperar la actualización de GitHub Pages.
```

Archivos que normalmente se actualizan con cada nuevo corte:

```text
data/report-data.json
data/regions.csv
data/provinces.csv
data/province-errors.csv
```

Los archivos de interfaz solo se reemplazan cuando se cambia el diseño o la lógica de visualización:

```text
index.html
style.css
app.js
```

## Indicadores mostrados en la web

La página muestra, entre otros datos:

- fecha de corte ONPE;
- porcentaje de actas contabilizadas;
- ventaja actual ONPE;
- ventaja proyectada Perú sin extranjero;
- voto extranjero ya contabilizado;
- voto extranjero pendiente estimado;
- ventaja ajustada con escenario Datum;
- porcentaje ajustado final;
- fuente de proyección usada: provincia o departamento;
- tabla regional;
- tabla provincial con filtros;
- escenarios de sensibilidad del voto extranjero.

## Advertencia metodológica

Este sitio presenta un escenario analítico no oficial. Los datos oficiales son únicamente los publicados por ONPE y, posteriormente, los validados por JNE.

La proyección puede cambiar entre cortes porque las actas pendientes dentro de una provincia o departamento no necesariamente tienen la misma distribución electoral que las actas ya contabilizadas.

Por eso, el informe debe leerse como una **estimación dinámica por corte**, no como una predicción definitiva ni como resultado oficial.

## Notas sobre GitHub Pages

Después de subir nuevos archivos y hacer commit, GitHub Pages puede tardar algunos minutos en mostrar la versión actualizada. Si la página no cambia de inmediato, se recomienda:

- revisar que el commit se haya completado;
- abrir la página en modo incógnito;
- agregar un parámetro temporal a la URL, por ejemplo:

```text
https://edwardwhitetower.github.io/reporte-onpe-datum/?v=1542
```

## Estado del proyecto

Proyecto en actualización manual durante el conteo electoral. La versión actual prioriza precisión metodológica mediante proyección provincial y control manual antes de publicar cada corte.
