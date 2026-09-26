CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'resident',
  avatar_url TEXT,
  city VARCHAR(120),
  neighborhood VARCHAR(120),
  phone VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  city VARCHAR(120),
  neighborhood VARCHAR(120),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(60) NOT NULL,
  severity VARCHAR(30) NOT NULL DEFAULT 'medium',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'image',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_community ON reports(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_report ON comments(report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

INSERT INTO users (id, name, email, password_hash, role, city, neighborhood, phone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Administrador ComuniWatch',
  'admin@communiwatch.com',
  '$2a$10$Jb0OZ3.7P9t5JQb4p3mBvOHg7Q2VdO3j5zX9f4Bd5eL0b1Q2Zt1rK',
  'admin',
  'São Paulo',
  'Centro',
  '+5511999999999'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO communities (id, name, slug, description, city, neighborhood, created_by)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Bairro Central',
  'bairro-central',
  'Comunidade do bairro para mobilização, denúncias e acompanhamento de serviços públicos.',
  'São Paulo',
  'Centro',
  '11111111-1111-1111-1111-111111111111'
),
(
  '33333333-3333-3333-3333-333333333333',
  'Vizinhos Unidos',
  'vizinhos-unidos',
  'Rede de apoio para melhorias de segurança, infraestrutura e comunicação local.',
  'São Paulo',
  'Vila Olímpia',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO community_members (community_id, user_id, role)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'admin'
)
ON CONFLICT (community_id, user_id) DO NOTHING;

INSERT INTO reports (id, user_id, community_id, title, description, category, severity, latitude, longitude, address, status)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Buraco na rua principal',
  'Infraestrutura',
  'road',
  'high',
  -23.550520,
  -46.633308,
  'Rua da Aurora, Centro - São Paulo',
  'open'
),
(
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'Iluminação pública com defeito',
  'Segurança',
  'lighting',
  'medium',
  -23.566220,
  -46.698800,
  'Avenida Brasil, Vila Olímpia',
  'in_progress'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO comments (id, report_id, user_id, message)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'Já encaminhei para a prefeitura local. Vamos acompanhar o andamento.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, user_id, type, title, message)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  'report_update',
  'Denúncia atualizada',
  'O status da ocorrência foi alterado para em andamento.'
)
ON CONFLICT (id) DO NOTHING;

SELECT 'ComuniWatch schema initialized successfully.' AS status;
