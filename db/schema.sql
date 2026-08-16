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

CREATE TABLE IF NOT EXISTS hoteles_busquedas (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  ciudad TEXT NOT NULL,
  pais TEXT,
  place_id TEXT,
  entrada DATE NOT NULL,
  salida DATE NOT NULL,
  adultos SMALLINT NOT NULL,
  menores SMALLINT NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL,
  hoteles_encontrados INTEGER,
  ambiente TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS hoteles_busquedas_creado_en_idx ON hoteles_busquedas (creado_en DESC);

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  email TEXT NOT NULL UNIQUE,
  nombre TEXT,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  id TEXT PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_en TIMESTAMPTZ NOT NULL,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sesiones_expira_idx ON sesiones(expira_en);

ALTER TABLE itinerarios ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

-- El destino de hoteles se elige del autocompletado de liteAPI: manda el place_id, no el país.
ALTER TABLE hoteles_busquedas ADD COLUMN IF NOT EXISTS place_id TEXT;
ALTER TABLE hoteles_busquedas ALTER COLUMN pais DROP NOT NULL;

CREATE TABLE IF NOT EXISTS hoteles_cotizaciones (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  busqueda_id BIGINT REFERENCES hoteles_busquedas (id) ON DELETE SET NULL,
  liteapi_hotel_id TEXT NOT NULL,
  liteapi_offer_id TEXT NOT NULL,
  hotel_nombre TEXT,
  habitacion TEXT,
  regimen TEXT,
  moneda TEXT NOT NULL,
  costo_neto NUMERIC(12, 2) NOT NULL,
  markup NUMERIC(12, 2) NOT NULL,
  precio_venta NUMERIC(12, 2) NOT NULL,
  regla_markup_id BIGINT REFERENCES reglas_markup (id) ON DELETE SET NULL,
  reembolsable BOOLEAN,
  datos JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS hoteles_cotizaciones_hotel_idx
  ON hoteles_cotizaciones (liteapi_hotel_id);

CREATE TABLE IF NOT EXISTS hoteles_reservas (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  cotizacion_id BIGINT REFERENCES hoteles_cotizaciones (id) ON DELETE SET NULL,
  liteapi_booking_id TEXT NOT NULL UNIQUE,
  confirmacion_hotel TEXT,
  estado TEXT NOT NULL,
  ambiente TEXT NOT NULL,
  moneda TEXT NOT NULL,
  costo_neto NUMERIC(12, 2) NOT NULL,
  markup NUMERIC(12, 2) NOT NULL,
  precio_venta NUMERIC(12, 2) NOT NULL,
  huesped_nombre TEXT,
  huesped_correo TEXT,
  respuesta JSONB NOT NULL
);

INSERT INTO reglas_markup (nombre, prioridad, porcentaje, monto_fijo, monto_minimo)
SELECT 'Markup general', 1000, 8.000, 0, 25
WHERE NOT EXISTS (SELECT 1 FROM reglas_markup);

ALTER TABLE sesiones ALTER COLUMN id TYPE TEXT USING id::TEXT;

CREATE TABLE IF NOT EXISTS captcha_challenges (
  id TEXT PRIMARY KEY,
  respuesta TEXT NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT false,
  expira_en TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS captcha_challenges_expira_idx ON captcha_challenges (expira_en);

-- Monitoreo de precios para recomendar el mejor momento de compra
CREATE TABLE IF NOT EXISTS monitoreo_precios (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  fecha_salida DATE NOT NULL,
  fecha_regreso DATE,
  adultos SMALLINT NOT NULL DEFAULT 1,
  menores SMALLINT NOT NULL DEFAULT 0,
  bebes SMALLINT NOT NULL DEFAULT 0,
  cabina TEXT,
  respetar_shabbat BOOLEAN NOT NULL DEFAULT true,
  email TEXT NOT NULL,
  frecuencia_horas INTEGER NOT NULL DEFAULT 6,
  proxima_ejecucion TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_precio NUMERIC(12,2),
  ultima_recomendacion TEXT,
  ultima_busqueda_id BIGINT REFERENCES busquedas(id) ON DELETE SET NULL,
  datos JSONB
);

CREATE INDEX IF NOT EXISTS monitoreo_precios_proxima_idx
  ON monitoreo_precios (proxima_ejecucion) WHERE activo;

CREATE TABLE IF NOT EXISTS historial_precios (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  monitoreo_id BIGINT NOT NULL REFERENCES monitoreo_precios(id) ON DELETE CASCADE,
  busqueda_id BIGINT REFERENCES busquedas(id) ON DELETE SET NULL,
  oferta_id TEXT,
  aerolinea TEXT,
  aerolinea_iata TEXT,
  moneda TEXT NOT NULL,
  precio_neto NUMERIC(12,2) NOT NULL,
  precio_venta NUMERIC(12,2) NOT NULL,
  equipaje_incluido JSONB,
  recomendacion TEXT,
  datos JSONB
);

CREATE INDEX IF NOT EXISTS historial_precios_monitoreo_idx
  ON historial_precios (monitoreo_id, creado_en DESC);

-- Viajes temáticos / experiencias curadas
CREATE TABLE IF NOT EXISTS paquetes_tematicos (
  id BIGSERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  slug TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  descripcion TEXT,
  imagen TEXT,
  origen_iata TEXT,
  destino_iata TEXT NOT NULL,
  destino_ciudad TEXT NOT NULL,
  destino_pais_code CHAR(2),
  duracion_noches INTEGER,
  adultos SMALLINT NOT NULL DEFAULT 1,
  menores SMALLINT[] DEFAULT '{}',
  bebes SMALLINT NOT NULL DEFAULT 0,
  cabina TEXT,
  aerolineas_preferidas TEXT[] DEFAULT '{}',
  hotel_estrellas_min INTEGER,
  tags TEXT[] DEFAULT '{}',
  datos JSONB
);

CREATE INDEX IF NOT EXISTS paquetes_tematicos_categoria_idx
  ON paquetes_tematicos (categoria, activo);

INSERT INTO paquetes_tematicos (
  slug, categoria, titulo, subtitulo, descripcion, imagen,
  origen_iata, destino_iata, destino_ciudad, destino_pais_code,
  duracion_noches, adultos, menores, bebes, cabina,
  aerolineas_preferidas, hotel_estrellas_min, tags, datos
)
SELECT v.slug, v.categoria, v.titulo, v.subtitulo, v.descripcion, v.imagen,
       v.origen_iata, v.destino_iata, v.destino_ciudad, v.destino_pais_code,
       v.duracion_noches, v.adultos, v.menores, v.bebes, v.cabina,
       v.aerolineas_preferidas, v.hotel_estrellas_min, v.tags, v.datos::jsonb
FROM (VALUES
  ('escapada-ejecutiva-buenos-aires', 'negocios', 'Escapada ejecutiva a Buenos Aires', 'Negocios en 3 días', 'Vuelo + hotel céntrico para reuniones y eventos corporativos.', NULL, 'MEX', 'EZE', 'Buenos Aires', 'AR', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['negocios','corporativo'], '{"tipo":"negocios","actividades":["tango","reuniones"]}'),
  ('familia-cancun-all-inclusive', 'familia', 'Familia en Cancún', 'Todo incluido + playa', 'Paquete familiar con vuelo directo y hotel en zona hotelera.', NULL, 'MEX', 'CUN', 'Cancún', 'MX', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['familia','playa'], '{"tipo":"familia","actividades":["playa","parques"]}'),
  ('aventura-machu-picchu', 'aventura', 'Aventura en Machu Picchu', 'Cusco y Valle Sagrado', 'Vuelo a Cusco, hotel boutique y experiencias de aventura.', NULL, 'MEX', 'CUZ', 'Cusco', 'PE', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 3, ARRAY['aventura','naturaleza'], '{"tipo":"aventura","actividades":["trekking","ruinas"]}'),
  ('romance-paris', 'romantico', 'Romance en París', 'Tour de luz y gastronomía', 'Vuelo y hotel boutique cerca del Sena, con cena incluida.', NULL, 'MEX', 'CDG', 'Paris', 'FR', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['romantico','gastronomia'], '{"tipo":"romantico","actividades":["cena","museos"]}'),
  ('gastronomia-oaxaca', 'gastronomia', 'Gastronomía en Oaxaca', 'Sabores y tradición', 'Vuelo y hotel en el centro histórico, experiencias culinarias.', NULL, 'MEX', 'OAX', 'Oaxaca', 'MX', 3, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['gastronomia','cultura'], '{"tipo":"gastronomia","actividades":["mezcal","mercados"]}'),
  ('incentivo-miami', 'ocio', 'Incentivo en Miami', 'Playas, compras y nightlife', 'Paquete ideal para grupos de incentivo o viajes de amigos.', NULL, 'MEX', 'MIA', 'Miami', 'US', 4, 4, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['ocio','incentivo','compras'], '{"tipo":"ocio","actividades":["playa","compras"]}'),
  ('playa-tulum', 'ocio', 'Descanso en Tulum', 'Boho-chic y cenotes', 'Vuelo a Cancún con traslado a Tulum y hotel boutique.', NULL, 'MEX', 'CUN', 'Tulum', 'MX', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['playa','wellness'], '{"tipo":"ocio","actividades":["cenotes","playa"]}')
) AS v(slug, categoria, titulo, subtitulo, descripcion, imagen, origen_iata, destino_iata, destino_ciudad, destino_pais_code, duracion_noches, adultos, menores, bebes, cabina, aerolineas_preferidas, hotel_estrellas_min, tags, datos)
WHERE NOT EXISTS (SELECT 1 FROM paquetes_tematicos);
