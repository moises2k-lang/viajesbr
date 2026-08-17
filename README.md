# Agencia de viajes

Buscador y emisor de vuelos con markup propio, construido sobre la API de [Duffel](https://duffel.com)
y Postgres autohospedado.

- **Front y API**: Next.js (App Router) para `viajesbr.sistemas-e.com`
- **Base de datos**: Postgres 17 propio (`agencia_viajes`), no Supabase
- **Proveedores de vuelos**: Duffel y preparación para Sabre Dev Studio (sandbox)

## Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión a la base `agencia_viajes` |
| `DATABASE_SSL` | `require` para forzar TLS contra Postgres |
| `DUFFEL_API_TOKEN` | Token de Duffel. `duffel_test_...` = sandbox, `duffel_live_...` = producción |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y llenar los valores
npm run db:migrate           # crea/actualiza tablas en agencia_viajes
npm run dev
```

## Flujo

1. `POST /api/buscar` crea un *offer request* en Duffel, aplica las reglas de markup y guarda la
   búsqueda y las cotizaciones.
2. La UI lista las ofertas ordenadas por precio de venta, con escalas, tarifa, equipaje y condiciones.
3. `POST /api/reservar` revalida la oferta, emite la orden en Duffel y guarda orden y pasajeros.
4. `/admin/markup` administra las reglas: porcentaje + monto fijo con mínimo garantizado, filtrables
   por aerolínea, ruta y moneda; se aplica la de menor prioridad que coincida.

## Costos de Duffel

Sin renta mensual: 3 USD por orden confirmada, 1% del valor total del contenido gestionado y 2 USD
por servicio adicional (equipaje/asiento). Sin acreditación IATA propia — Duffel emite.
