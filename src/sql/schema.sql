-- Create the settings table
CREATE TABLE
  settings (
    id bigint PRIMARY KEY,
    phone_number_id text,
    waba_id text,
    access_token text,
    endpoint text,
    marks_template_name text,
    fees_template_name text,
    created_at timestamp with time zone not null default now()
  );

-- Enable Row Level Security (RLS)
-- You may need to configure policies based on your auth setup
alter table settings enable row level security;

-- Allow public read access
create policy "Public settings are viewable by everyone." on settings for
select
  using (true);

-- Allow insert for authenticated users
-- This is just an example, adjust based on your needs
create policy "Allow insert for authenticated users" on settings for
insert
  with check (auth.role () = 'authenticated');

-- Insert a default settings row
-- The application logic assumes a single row with id = 1
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
