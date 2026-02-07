-- MealFlow Initial Schema
-- All primary keys are UUIDs stored as TEXT
-- Dates stored as ISO 8601 strings

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  paprika_uid TEXT UNIQUE,
  title TEXT NOT NULL,
  directions TEXT NOT NULL DEFAULT '',
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  total_time_minutes INTEGER,
  servings INTEGER NOT NULL DEFAULT 2,
  effort_level INTEGER NOT NULL DEFAULT 2 CHECK (effort_level IN (1, 2, 3)),
  categories TEXT NOT NULL DEFAULT '[]',  -- JSON array of strings
  tags TEXT NOT NULL DEFAULT '[]',        -- JSON array of strings
  image_url TEXT,
  source TEXT,
  last_made TEXT,
  times_made INTEGER NOT NULL DEFAULT 0,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  notes TEXT NOT NULL DEFAULT '',
  contains_tree_nuts INTEGER NOT NULL DEFAULT 0,  -- boolean: 0 or 1
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_recipes_effort_level ON recipes(effort_level);
CREATE INDEX IF NOT EXISTS idx_recipes_contains_tree_nuts ON recipes(contains_tree_nuts);
CREATE INDEX IF NOT EXISTS idx_recipes_paprika_uid ON recipes(paprika_uid);
CREATE INDEX IF NOT EXISTS idx_recipes_last_made ON recipes(last_made);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  category TEXT,
  recipe_id TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);

CREATE TABLE IF NOT EXISTS meal_plans (
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL,  -- Monday of the plan week (YYYY-MM-DD)
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_week_start ON meal_plans(week_start);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plans_week ON meal_plans(week_start, created_by);

CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id TEXT PRIMARY KEY,
  meal_plan_id TEXT NOT NULL,
  date TEXT NOT NULL,          -- YYYY-MM-DD
  meal_type TEXT NOT NULL DEFAULT 'dinner',
  classification TEXT NOT NULL CHECK (classification IN ('free', 'partial', 'busy')),
  override_classification TEXT CHECK (override_classification IS NULL OR override_classification IN ('free', 'partial', 'busy')),
  recipe_id TEXT,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'confirmed', 'eating_out', 'leftovers')),
  leftover_source_entry_id TEXT,
  headcount INTEGER NOT NULL DEFAULT 2,
  notes TEXT,
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON SET NULL,
  FOREIGN KEY (leftover_source_entry_id) REFERENCES meal_plan_entries(id) ON SET NULL
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_plan_id ON meal_plan_entries(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_date ON meal_plan_entries(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plan_entries_plan_date ON meal_plan_entries(meal_plan_id, date, meal_type);

CREATE TABLE IF NOT EXISTS shopping_lists (
  id TEXT PRIMARY KEY,
  meal_plan_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finalized_at TEXT,
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_meal_plan ON shopping_lists(meal_plan_id);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id TEXT PRIMARY KEY,
  shopping_list_id TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  source_recipes TEXT NOT NULL DEFAULT '[]',  -- JSON array of recipe IDs
  have_it INTEGER NOT NULL DEFAULT 0,         -- boolean: 0 or 1
  is_recurring_essential INTEGER NOT NULL DEFAULT 0,  -- boolean: 0 or 1
  FOREIGN KEY (shopping_list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list ON shopping_list_items(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_category ON shopping_list_items(category);

CREATE TABLE IF NOT EXISTS pantry_staples (
  id TEXT PRIMARY KEY,
  ingredient_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recurring_essentials (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  category TEXT NOT NULL DEFAULT 'other'
);

-- Seed some common pantry staples
INSERT OR IGNORE INTO pantry_staples (id, ingredient_name) VALUES
  ('ps-001', 'salt'),
  ('ps-002', 'black pepper'),
  ('ps-003', 'olive oil'),
  ('ps-004', 'vegetable oil'),
  ('ps-005', 'butter'),
  ('ps-006', 'garlic powder'),
  ('ps-007', 'onion powder'),
  ('ps-008', 'paprika'),
  ('ps-009', 'cumin'),
  ('ps-010', 'chili powder'),
  ('ps-011', 'oregano'),
  ('ps-012', 'italian seasoning'),
  ('ps-013', 'bay leaves'),
  ('ps-014', 'flour'),
  ('ps-015', 'sugar'),
  ('ps-016', 'brown sugar'),
  ('ps-017', 'baking soda'),
  ('ps-018', 'baking powder'),
  ('ps-019', 'vanilla extract'),
  ('ps-020', 'soy sauce'),
  ('ps-021', 'worcestershire sauce'),
  ('ps-022', 'hot sauce'),
  ('ps-023', 'rice'),
  ('ps-024', 'chicken broth'),
  ('ps-025', 'beef broth');
