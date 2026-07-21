CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id text PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  bio text,
  location_label text,
  job_role text DEFAULT 'worker',
  market_role text DEFAULT 'buyer',
  id_verification_status text DEFAULT 'unverified',
  id_photo_uri text,
  resume_uri text,
  birth_date date,
  verification_submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id text NOT NULL,
  title text NOT NULL,
  description text,
  requirements text[] DEFAULT '{}',
  budget_min numeric DEFAULT 0,
  budget_max numeric DEFAULT 0,
  location_label text,
  latitude double precision,
  longitude double precision,
  is_urgent boolean DEFAULT false,
  status text DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id text NOT NULL,
  cover_letter text,
  expected_rate numeric,
  resume_uri text,
  answers jsonb DEFAULT '{}',
  availability_note text,
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id text NOT NULL,
  store_name text NOT NULL DEFAULT '',
  name text NOT NULL,
  description text,
  category text,
  price numeric DEFAULT 0,
  location_label text,
  latitude double precision,
  longitude double precision,
  image_url text,
  is_open boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  vendor_id text NOT NULL,
  buyer_id text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  delivery_mode text NOT NULL DEFAULT 'pickup' CHECK (delivery_mode IN ('pickup', 'delivery')),
  delivery_address text,
  notes text,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','preparing','ready','completed','cancelled','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_orders_buyer_idx ON marketplace_orders (buyer_id, created_at desc);
CREATE INDEX IF NOT EXISTS marketplace_orders_vendor_idx ON marketplace_orders (vendor_id, created_at desc);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  sender_id text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_room_idx ON messages (room_id, created_at);

CREATE TABLE IF NOT EXISTS conversation_reads (
  room_id text NOT NULL,
  user_id text NOT NULL,
  last_read_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  category text,
  title text,
  body text,
  entity_type text,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id text NOT NULL,
  blocked_user_id text NOT NULL,
  PRIMARY KEY (blocker_id, blocked_user_id)
);
