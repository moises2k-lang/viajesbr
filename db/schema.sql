-- Esquema de la agencia de viajes (Postgres 17)
-- Se aplica con: npm run db:migrate

CREATE TABLE IF NOT EXISTS busquedas (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  fecha_salida DATE NOT NULL,
  fecha_regreso DATE,
  adultos SMALLINT NOT NULL,
  menores SMALLINT NOT NULL DEFAULT 0,
  bebes SMALLINT NOT NULL DEFAULT 0,
  cabina TEXT,
  duffel_offer_request_id TEXT,
  ofertas_encontradas INTEGER,
  origen_solicitud TEXT
);

CREATE INDEX IF NOT EXISTS busquedas_creado_en_idx ON busquedas (creado_en DESC);

CREATE TABLE IF NOT EXISTS reglas_markup (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  prioridad INTEGER NOT NULL DEFAULT 100,
  aerolinea_iata TEXT,
  origen TEXT,
  destino TEXT,
  moneda TEXT,
  porcentaje NUMERIC(6, 3) NOT NULL DEFAULT 0,
  monto_fijo NUMERIC(12, 2) NOT NULL DEFAULT 0,
  monto_minimo NUMERIC(12, 2) NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reglas_markup_orden_idx ON reglas_markup (activa, prioridad);

CREATE TABLE IF NOT EXISTS cotizaciones (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  busqueda_id BIGINT REFERENCES busquedas (id) ON DELETE SET NULL,
  duffel_offer_id TEXT NOT NULL,
  aerolinea TEXT,
  aerolinea_iata TEXT,
  moneda TEXT NOT NULL,
  costo_neto NUMERIC(12, 2) NOT NULL,
  markup NUMERIC(12, 2) NOT NULL,
  precio_venta NUMERIC(12, 2) NOT NULL,
  regla_markup_id BIGINT REFERENCES reglas_markup (id) ON DELETE SET NULL,
  expira_en TIMESTAMPTZ,
  itinerario JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS cotizaciones_offer_idx ON cotizaciones (duffel_offer_id);

CREATE TABLE IF NOT EXISTS ordenes (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  cotizacion_id BIGINT REFERENCES cotizaciones (id) ON DELETE SET NULL,
  duffel_order_id TEXT NOT NULL UNIQUE,
  pnr TEXT,
  estado TEXT NOT NULL,
  ambiente TEXT NOT NULL,
  moneda TEXT NOT NULL,
  costo_neto NUMERIC(12, 2) NOT NULL,
  markup NUMERIC(12, 2) NOT NULL,
  precio_venta NUMERIC(12, 2) NOT NULL,
  contacto_email TEXT,
  contacto_telefono TEXT,
  respuesta JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS pasajeros (
  id BIGSERIAL PRIMARY KEY,
  orden_id BIGINT NOT NULL REFERENCES ordenes (id) ON DELETE CASCADE,
  duffel_passenger_id TEXT,
  tipo TEXT NOT NULL,
  titulo TEXT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  genero TEXT,
  email TEXT,
  telefono TEXT,
  documento_tipo TEXT,
  documento_numero TEXT,
  documento_pais TEXT,
  documento_expira DATE
);

CREATE INDEX IF NOT EXISTS pasajeros_orden_idx ON pasajeros (orden_id);

CREATE TABLE IF NOT EXISTS itinerarios (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  titulo TEXT NOT NULL,
  cliente TEXT NOT NULL,
  resumen TEXT,
  moneda TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador'
);

CREATE TABLE IF NOT EXISTS itinerario_bloques (
  id BIGSERIAL PRIMARY KEY,
  itinerario_id BIGINT NOT NULL REFERENCES itinerarios (id) ON DELETE CASCADE,
  posicion INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  fecha DATE,
  fecha_fin DATE,
  detalle TEXT,
  proveedor TEXT,
  costo_neto NUMERIC(12, 2),
  precio_venta NUMERIC(12, 2),
  cotizacion_id BIGINT REFERENCES cotizaciones (id) ON DELETE SET NULL,
  datos JSONB
);

CREATE INDEX IF NOT EXISTS itinerario_bloques_itinerario_idx
  ON itinerario_bloques (itinerario_id, posicion);

INSERT INTO reglas_markup (nombre, prioridad, porcentaje, monto_fijo, monto_minimo)
SELECT 'Markup general', 1000, 8.000, 0, 25
WHERE NOT EXISTS (SELECT 1 FROM reglas_markup);
