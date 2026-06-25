# ArbitraAR

Aplicacion web estatica para decidir si conviene convertir dolares a pesos mediante CCL/MEP considerando costos reales.

## MVP

- Monto en USD.
- Cotizaciones Oficial, MEP, CCL y Blue.
- Broker inicial: PPI y Prex.
- Comisiones configurables.
- Perfil de riesgo.
- Resultado con pesos netos, tipo efectivo, ganancia, break even y semaforo.
- Cotizaciones en vivo desde DolarAPI, con fallback a edicion manual.
- Comision de PPI para Compra/Venta de Titulos Publicos cargada desde la pagina oficial con `v=072026`, mostrando vigencia actual y proxima cuando existe.

## Desarrollo

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

El proyecto usa assets relativos en build para funcionar en GitHub Pages sin depender del nombre exacto del repositorio.
