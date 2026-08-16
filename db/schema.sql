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
  ('escapada-ejecutiva-buenos-aires', 'negocios', 'Escapada ejecutiva a Buenos Aires', 'Negocios en 3 días', 'Vuelo + hotel céntrico para reuniones y eventos corporativos.', '/paquetes/escapada-ejecutiva-buenos-aires.jpg', 'MEX', 'EZE', 'Buenos Aires', 'AR', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['negocios','corporativo']::TEXT[], '{"tipo": "negocios", "actividades": ["tango", "reuniones"]}'::jsonb),
  ('familia-cancun-all-inclusive', 'familia', 'Familia en Cancún', 'Todo incluido + playa', 'Paquete familiar con vuelo directo y hotel en zona hotelera.', '/paquetes/familia-cancun-all-inclusive.jpg', 'MEX', 'CUN', 'Cancún', 'MX', 5, 4, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['familia','playa']::TEXT[], '{"tipo": "familia", "actividades": ["playa", "parques"]}'::jsonb),
  ('aventura-machu-picchu', 'aventura', 'Aventura en Machu Picchu', 'Cusco y Valle Sagrado', 'Vuelo a Cusco, hotel boutique y experiencias de aventura.', '/paquetes/aventura-machu-picchu.jpg', 'MEX', 'CUZ', 'Cusco', 'PE', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 3, ARRAY['aventura','naturaleza']::TEXT[], '{"tipo": "aventura", "actividades": ["trekking", "ruinas"]}'::jsonb),
  ('romance-paris', 'romantico', 'Romance en París', 'Tour de luz y gastronomía', 'Vuelo y hotel boutique cerca del Sena, con cena incluida.', '/paquetes/romance-paris.jpg', 'MEX', 'CDG', 'París', 'FR', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['romantico','gastronomia']::TEXT[], '{"tipo": "romantico", "actividades": ["cena", "museos"]}'::jsonb),
  ('gastronomia-oaxaca', 'gastronomia', 'Gastronomía en Oaxaca', 'Sabores y tradición', 'Vuelo y hotel en el centro histórico, experiencias culinarias.', '/paquetes/gastronomia-oaxaca.jpg', 'MEX', 'OAX', 'Oaxaca', 'MX', 3, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['gastronomia','cultura']::TEXT[], '{"tipo": "gastronomia", "actividades": ["mezcal", "mercados"]}'::jsonb),
  ('incentivo-miami', 'ocio', 'Incentivo en Miami', 'Playas, compras y nightlife', 'Paquete ideal para grupos de incentivo o viajes de amigos.', '/paquetes/incentivo-miami.jpg', 'MEX', 'MIA', 'Miami', 'US', 4, 4, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['ocio','incentivo','compras']::TEXT[], '{"tipo": "ocio", "actividades": ["playa", "compras"]}'::jsonb),
  ('playa-tulum', 'playa', 'Descanso en Tulum', 'Boho-chic y cenotes', 'Vuelo a Cancún con traslado a Tulum y hotel boutique.', '/paquetes/playa-tulum.jpg', 'MEX', 'CUN', 'Tulum', 'MX', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 3, ARRAY['playa','wellness']::TEXT[], '{"tipo": "playa", "actividades": ["cenotes", "playa"]}'::jsonb),
  ('negocios-nueva-york', 'negocios', 'Negocios en Nueva York', 'Wall Street y reuniones', 'Vuelo directo y hotel en Manhattan para ejecutivos.', '/paquetes/negocios-nueva-york.jpg', 'MEX', 'JFK', 'Nueva York', 'US', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['negocios','corporativo']::TEXT[], '{"tipo": "negocios", "actividades": ["reuniones", "networking"]}'::jsonb),
  ('ocio-los-angeles', 'ocio', 'Ocio en Los Ángeles', 'Cine, playas y Rodeo Drive', 'Escapada a la costa oeste con hotel boutique y tour de Hollywood.', '/paquetes/ocio-los-angeles.jpg', 'MEX', 'LAX', 'Los Ángeles', 'US', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['ocio','playa','compras']::TEXT[], '{"tipo": "ocio", "actividades": ["playa", "tours"]}'::jsonb),
  ('cultural-madrid', 'cultural', 'Cultura en Madrid', 'Museos, tapas y historia', 'Vuelo y hotel céntrico para recorrer los museos imperdibles.', '/paquetes/cultural-madrid.jpg', 'MEX', 'MAD', 'Madrid', 'ES', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['cultural','gastronomia']::TEXT[], '{"tipo": "cultural", "actividades": ["museos", "tapas"]}'::jsonb),
  ('ocio-barcelona', 'ocio', 'Ocio en Barcelona', 'Arquitectura y playa urbana', 'Gaudí, gastronomía y relax en la Barceloneta.', '/paquetes/ocio-barcelona.jpg', 'MEX', 'BCN', 'Barcelona', 'ES', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['ocio','cultural','playa']::TEXT[], '{"tipo": "ocio", "actividades": ["gaudi", "playa"]}'::jsonb),
  ('gastronomia-roma', 'gastronomia', 'Gastronomía en Roma', 'Pasta, vino y ruinas', 'Vuelo y hotel cerca del centro para una experiencia culinaria e histórica.', '/paquetes/gastronomia-roma.jpg', 'MEX', 'FCO', 'Roma', 'IT', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['gastronomia','cultural']::TEXT[], '{"tipo": "gastronomia", "actividades": ["trattorias", "coliseo"]}'::jsonb),
  ('negocios-londres', 'negocios', 'Negocios en Londres', 'City y networking', 'Hotel en The City y acceso rápido a la City de Londres.', '/paquetes/negocios-londres.jpg', 'MEX', 'LHR', 'Londres', 'GB', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['negocios','finanzas']::TEXT[], '{"tipo": "negocios", "actividades": ["reuniones", "city"]}'::jsonb),
  ('romantico-amsterdam', 'romantico', 'Romance en Ámsterdam', 'Canales y tulipanes', 'Paseo en bote por los canales y hotel boutique.', '/paquetes/romantico-amsterdam.jpg', 'MEX', 'AMS', 'Ámsterdam', 'NL', 3, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['romantico','cultural']::TEXT[], '{"tipo": "romantico", "actividades": ["canales", "museos"]}'::jsonb),
  ('negocios-frankfurt', 'negocios', 'Negocios en Frankfurt', 'Finanzas y ferias', 'Vuelo y hotel cerca del distrito financiero y Messe.', '/paquetes/negocios-frankfurt.jpg', 'MEX', 'FRA', 'Frankfurt', 'DE', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['negocios','ferias']::TEXT[], '{"tipo": "negocios", "actividades": ["ferias", "reuniones"]}'::jsonb),
  ('cultural-estambul', 'cultural', 'Cultura en Estambul', 'Dos continentes, mil sabores', 'Vuelo y hotel en Sultanahmet para explorar la mezquita y el bazar.', '/paquetes/cultural-estambul.jpg', 'MEX', 'IST', 'Estambul', 'TR', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['cultural','gastronomia']::TEXT[], '{"tipo": "cultural", "actividades": ["mezquitas", "bazar"]}'::jsonb),
  ('cultural-tel-aviv', 'cultural', 'Cultura en Tel Aviv', 'Mar, historia y gastronomía', 'Vuelo y hotel boutique cerca del puerto antiguo de Jaffa.', '/paquetes/cultural-tel-aviv.jpg', 'MEX', 'TLV', 'Tel Aviv', 'IL', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['cultural','playa']::TEXT[], '{"tipo": "cultural", "actividades": ["jaffa", "playa"]}'::jsonb),
  ('negocios-sao-paulo', 'negocios', 'Negocios en Sao Paulo', 'Avenida Paulista y eventos', 'Vuelo y hotel en el corazón financiero de Brasil.', '/paquetes/negocios-sao-paulo.jpg', 'MEX', 'GRU', 'Sao Paulo', 'BR', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['negocios','corporativo']::TEXT[], '{"tipo": "negocios", "actividades": ["reuniones", "eventos"]}'::jsonb),
  ('playa-rio-de-janeiro', 'playa', 'Playa en Río de Janeiro', 'Copacabana y caipiriñas', 'Vuelo y hotel con vista al Pan de Azúcar y playas.', '/paquetes/playa-rio-de-janeiro.jpg', 'MEX', 'GIG', 'Río de Janeiro', 'BR', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['playa','ocio']::TEXT[], '{"tipo": "playa", "actividades": ["copacabana", "tours"]}'::jsonb),
  ('aventura-santiago', 'aventura', 'Aventura en Santiago', 'Andes, vino y nieve', 'Vuelo y hotel base para excursiones a la cordillera.', '/paquetes/aventura-santiago.jpg', 'MEX', 'SCL', 'Santiago', 'CL', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 3, ARRAY['aventura','naturaleza']::TEXT[], '{"tipo": "aventura", "actividades": ["andinos", "vino"]}'::jsonb),
  ('negocios-bogota', 'negocios', 'Negocios en Bogotá', 'Centro financiero y startup', 'Vuelo y hotel cerca de Zona T para reuniones.', '/paquetes/negocios-bogota.jpg', 'MEX', 'BOG', 'Bogotá', 'CO', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['negocios','corporativo']::TEXT[], '{"tipo": "negocios", "actividades": ["reuniones", "networking"]}'::jsonb),
  ('gastronomia-lima', 'gastronomia', 'Gastronomía en Lima', 'Ceviche, pisco y costa', 'Vuelo y hotel en Miraflores con tours gastronómicos.', '/paquetes/gastronomia-lima.jpg', 'MEX', 'LIM', 'Lima', 'PE', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['gastronomia','cultural']::TEXT[], '{"tipo": "gastronomia", "actividades": ["ceviche", "barranco"]}'::jsonb),
  ('negocios-panama', 'negocios', 'Negocios en Panamá', 'Hub financiero y canal', 'Vuelo y hotel en el centro financiero con vista al canal.', '/paquetes/negocios-panama.jpg', 'MEX', 'PTY', 'Ciudad de Panamá', 'PA', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['negocios','hub']::TEXT[], '{"tipo": "negocios", "actividades": ["reuniones", "canal"]}'::jsonb),
  ('aventura-san-jose-costa-rica', 'aventura', 'Aventura en Costa Rica', 'Selva, volcanes y canopy', 'Vuelo a San José con excursiones a la naturaleza.', '/paquetes/aventura-san-jose-costa-rica.jpg', 'MEX', 'SJO', 'San José', 'CR', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 3, ARRAY['aventura','naturaleza']::TEXT[], '{"tipo": "aventura", "actividades": ["canopy", "volcanes"]}'::jsonb),
  ('familia-punta-cana', 'familia', 'Familia en Punta Cana', 'Todo incluido y caribe azul', 'Resort familiar todo incluido con actividades para niños.', '/paquetes/familia-punta-cana.jpg', 'MEX', 'PUJ', 'Punta Cana', 'DO', 5, 4, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['familia','playa']::TEXT[], '{"tipo": "familia", "actividades": ["playa", "resort"]}'::jsonb),
  ('playa-aruba', 'playa', 'Playa en Aruba', 'Caribe holandés y relax', 'Vuelo y hotel boutique a pasos de Eagle Beach.', '/paquetes/playa-aruba.jpg', 'MEX', 'AUA', 'Aruba', 'AW', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['playa','ocio']::TEXT[], '{"tipo": "playa", "actividades": ["playa", "snorkel"]}'::jsonb),
  ('luna-de-miel-honolulu', 'luna_de_miel', 'Luna de miel en Honolulu', 'Hawai, playas y volcanes', 'Vuelo y resort frente al mar con Diamond Head de fondo.', '/paquetes/luna-de-miel-honolulu.jpg', 'MEX', 'HNL', 'Honolulu', 'US', 6, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 5, ARRAY['luna_de_miel','playa']::TEXT[], '{"tipo": "luna_de_miel", "actividades": ["playa", "volcanes"]}'::jsonb),
  ('naturaleza-vancouver', 'naturaleza', 'Naturaleza en Vancouver', 'Montañas, bosques y mar', 'Vuelo y hotel cerca de Stanley Park y las montañas.', '/paquetes/naturaleza-vancouver.jpg', 'MEX', 'YVR', 'Vancouver', 'CA', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 3, ARRAY['naturaleza','aventura']::TEXT[], '{"tipo": "naturaleza", "actividades": ["parques", "senderismo"]}'::jsonb),
  ('negocios-toronto', 'negocios', 'Negocios en Toronto', 'Bay Street y tecnología', 'Vuelo y hotel en el centro financiero de Canadá.', '/paquetes/negocios-toronto.jpg', 'MEX', 'YYZ', 'Toronto', 'CA', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['negocios','tecnologia']::TEXT[], '{"tipo": "negocios", "actividades": ["reuniones", "tech"]}'::jsonb),
  ('cultural-tokio', 'cultural', 'Cultura en Tokio', 'Templos, anime y gastronomía', 'Vuelo y hotel en Shinjuku para explorar la capital japonesa.', '/paquetes/cultural-tokio.jpg', 'MEX', 'HND', 'Tokio', 'JP', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['cultural','gastronomia']::TEXT[], '{"tipo": "cultural", "actividades": ["templos", "sushi"]}'::jsonb),
  ('cultural-seul', 'cultural', 'Cultura en Seúl', 'Palacios, K-pop y tecnología', 'Vuelo y hotel en Myeongdong con tour de palacios.', '/paquetes/cultural-seul.jpg', 'MEX', 'ICN', 'Seúl', 'KR', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['cultural','gastronomia']::TEXT[], '{"tipo": "cultural", "actividades": ["palacios", "gastronomia"]}'::jsonb),
  ('gastronomia-bangkok', 'gastronomia', 'Gastronomía en Bangkok', 'Street food y templos flotantes', 'Vuelo y hotel cerca del río con tour gastronómico nocturno.', '/paquetes/gastronomia-bangkok.jpg', 'MEX', 'BKK', 'Bangkok', 'TH', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 3, ARRAY['gastronomia','cultural']::TEXT[], '{"tipo": "gastronomia", "actividades": ["street food", "templos"]}'::jsonb),
  ('negocios-singapur', 'negocios', 'Negocios en Singapur', 'Hub asiático y futurista', 'Vuelo y hotel en Marina Bay para reuniones y eventos.', '/paquetes/negocios-singapur.jpg', 'MEX', 'SIN', 'Singapur', 'SG', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 5, ARRAY['negocios','lujo']::TEXT[], '{"tipo": "negocios", "actividades": ["reuniones", "marina"]}'::jsonb),
  ('negocios-hong-kong', 'negocios', 'Negocios en Hong Kong', 'Finanzas y puerto', 'Vuelo y hotel en Central con vista al Victoria Harbour.', '/paquetes/negocios-hong-kong.jpg', 'MEX', 'HKG', 'Hong Kong', 'HK', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['negocios','finanzas']::TEXT[], '{"tipo": "negocios", "actividades": ["reuniones", "harbour"]}'::jsonb),
  ('aventura-sydney', 'aventura', 'Aventura en Sydney', 'Puente, ópera y surf', 'Vuelo y hotel base para excursiones por la costa australiana.', '/paquetes/aventura-sydney.jpg', 'MEX', 'SYD', 'Sydney', 'AU', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['aventura','playa']::TEXT[], '{"tipo": "aventura", "actividades": ["surf", "harbour"]}'::jsonb),
  ('naturaleza-auckland', 'naturaleza', 'Naturaleza en Auckland', 'Islas, viñedos y hobbits', 'Vuelo y hotel con excursiones a islas y parques geotérmicos.', '/paquetes/naturaleza-auckland.jpg', 'MEX', 'AKL', 'Auckland', 'NZ', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 3, ARRAY['naturaleza','aventura']::TEXT[], '{"tipo": "naturaleza", "actividades": ["islas", "senderismo"]}'::jsonb),
  ('aventura-ciudad-del-cabo', 'aventura', 'Aventura en Ciudad del Cabo', 'Montaña de la Mesa y viñedos', 'Vuelo y hotel para explorar Cape Town y la Península.', '/paquetes/aventura-ciudad-del-cabo.jpg', 'MEX', 'CPT', 'Ciudad del Cabo', 'ZA', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['aventura','naturaleza']::TEXT[], '{"tipo": "aventura", "actividades": ["table mountain", "viñedos"]}'::jsonb),
  ('safari-johannesburgo', 'aventura', 'Safari desde Johannesburgo', 'Vida salvaje y sabana', 'Vuelo y hotel con excursión de safari de día completo.', '/paquetes/safari-johannesburgo.jpg', 'MEX', 'JNB', 'Johannesburgo', 'ZA', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['aventura','safari']::TEXT[], '{"tipo": "aventura", "actividades": ["safari", "sabana"]}'::jsonb),
  ('cultural-el-cairo', 'cultural', 'Cultura en El Cairo', 'Pirámides y Nilo', 'Vuelo y hotel con visita a Giza y Museo Egipcio.', '/paquetes/cultural-el-cairo.jpg', 'MEX', 'CAI', 'El Cairo', 'EG', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['cultural','historia']::TEXT[], '{"tipo": "cultural", "actividades": ["piramides", "nilo"]}'::jsonb),
  ('cultural-marrakech', 'cultural', 'Cultura en Marrakech', 'Souks, palacios y desierto', 'Vuelo y riad en la medina con tour de palacios y jardines.', '/paquetes/cultural-marrakech.jpg', 'MEX', 'RAK', 'Marrakech', 'MA', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['cultural','gastronomia']::TEXT[], '{"tipo": "cultural", "actividades": ["souk", "palacios"]}'::jsonb),
  ('cultural-dublin', 'cultural', 'Cultura en Dublín', 'Pubs, literatura y castillos', 'Vuelo y hotel cerca de Temple Bar con tour de pubs y castillos.', '/paquetes/cultural-dublin.jpg', 'MEX', 'DUB', 'Dublín', 'IE', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['cultural','gastronomia']::TEXT[], '{"tipo": "cultural", "actividades": ["pubs", "castillos"]}'::jsonb),
  ('aventura-reikiavik', 'aventura', 'Aventura en Reikiavik', 'Auroras, géiseres y glaciares', 'Vuelo y hotel base para tours de auroras y el Círculo Dorado.', '/paquetes/aventura-reikiavik.jpg', 'MEX', 'KEF', 'Reikiavik', 'IS', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 3, ARRAY['aventura','naturaleza']::TEXT[], '{"tipo": "aventura", "actividades": ["auroras", "geiseres"]}'::jsonb),
  ('cultural-copenhague', 'cultural', 'Cultura en Copenhague', 'Hygge, bicis y canales', 'Vuelo y hotel cerca de Nyhavn con tour en bicicleta.', '/paquetes/cultural-copenhague.jpg', 'MEX', 'CPH', 'Copenhague', 'DK', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['cultural','gastronomia']::TEXT[], '{"tipo": "cultural", "actividades": ["canal", "bicis"]}'::jsonb),
  ('romantico-venecia', 'romantico', 'Romance en Venecia', 'Góndolas y puestas de sol', 'Vuelo y hotel boutique con paseo en góndola incluido.', '/paquetes/romantico-venecia.jpg', 'MEX', 'VCE', 'Venecia', 'IT', 3, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['romantico','cultural']::TEXT[], '{"tipo": "romantico", "actividades": ["gondola", "piazza"]}'::jsonb),
  ('luna-de-miel-santorini', 'luna_de_miel', 'Luna de miel en Santorini', 'Atardeceres y calderas', 'Vuelo y hotel con vistas al mar Egeo, cena romántica incluida.', '/paquetes/luna-de-miel-santorini.jpg', 'MEX', 'JTR', 'Santorini', 'GR', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 5, ARRAY['luna_de_miel','romantico']::TEXT[], '{"tipo": "luna_de_miel", "actividades": ["atardecer", "crucero"]}'::jsonb),
  ('cultural-lisboa', 'cultural', 'Cultura en Lisboa', 'Tranvías, fado y azulejos', 'Vuelo y hotel en Alfama con espectáculo de fado.', '/paquetes/cultural-lisboa.jpg', 'MEX', 'LIS', 'Lisboa', 'PT', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['cultural','gastronomia']::TEXT[], '{"tipo": "cultural", "actividades": ["fado", "tranvias"]}'::jsonb),
  ('familia-costa-del-sol', 'familia', 'Familia en Costa del Sol', 'Playas, pueblos blancos y paella', 'Vuelo a Málaga con hotel familiar y excursiones a pueblos blancos.', '/paquetes/familia-costa-del-sol.jpg', 'MEX', 'AGP', 'Costa del Sol', 'ES', 5, 4, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['familia','playa']::TEXT[], '{"tipo": "familia", "actividades": ["playa", "pueblos"]}'::jsonb),
  ('negocios-zurich', 'negocios', 'Negocios en Zúrich', 'Finanzas, relojes y chocolate', 'Vuelo y hotel en el centro financiero suizo.', '/paquetes/negocios-zurich.jpg', 'MEX', 'ZRH', 'Zúrich', 'CH', 3, 1, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 5, ARRAY['negocios','lujo']::TEXT[], '{"tipo": "negocios", "actividades": ["reuniones", "relojes"]}'::jsonb),
  ('aventura-denver', 'aventura', 'Aventura en Denver', 'Rocallosas, esquí y cerveza artesanal', 'Vuelo y hotel base para excursiones a las Montañas Rocosas.', '/paquetes/aventura-denver.jpg', 'MEX', 'DEN', 'Denver', 'US', 5, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 3, ARRAY['aventura','naturaleza']::TEXT[], '{"tipo": "aventura", "actividades": ["senderismo", "esqui"]}'::jsonb),
  ('ocio-las-vegas', 'ocio', 'Ocio en Las Vegas', 'Espectáculos, casinos y desierto', 'Vuelo y hotel en The Strip con show incluido.', '/paquetes/ocio-las-vegas.jpg', 'MEX', 'LAS', 'Las Vegas', 'US', 4, 2, ARRAY[]::SMALLINT[], 0, 'economy', ARRAY[]::TEXT[], 4, ARRAY['ocio','espectaculos']::TEXT[], '{"tipo": "ocio", "actividades": ["shows", "desierto"]}'::jsonb)
) AS v(slug, categoria, titulo, subtitulo, descripcion, imagen, origen_iata, destino_iata, destino_ciudad, destino_pais_code, duracion_noches, adultos, menores, bebes, cabina, aerolineas_preferidas, hotel_estrellas_min, tags, datos)
WHERE NOT EXISTS (SELECT 1 FROM paquetes_tematicos);
