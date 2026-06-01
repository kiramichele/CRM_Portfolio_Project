-- ============================================================================
-- ServiceHub — Category reference data
-- Reference data ships as a migration so the schema is usable immediately.
-- ============================================================================

insert into categories (slug, name, description) values
  ('web-development',    'Web Development',     'Frontend, backend, and full-stack web work'),
  ('mobile-development', 'Mobile Development',  'iOS, Android, and cross-platform apps'),
  ('design',            'Design & Creative',   'UI/UX, branding, illustration, and graphics'),
  ('writing',           'Writing & Content',   'Copywriting, technical writing, and editing'),
  ('data',              'Data & Analytics',    'Data engineering, analysis, and visualization'),
  ('ai-ml',             'AI & Machine Learning','LLM apps, model training, and ML pipelines'),
  ('marketing',         'Marketing & SEO',     'Growth, SEO, ads, and social media'),
  ('devops',            'DevOps & Cloud',      'Infrastructure, CI/CD, and cloud architecture'),
  ('admin-support',     'Admin & Support',     'Virtual assistance, data entry, and customer support'),
  ('video',             'Video & Animation',   'Editing, motion graphics, and animation')
on conflict (slug) do nothing;
