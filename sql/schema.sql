-- Postgres schema for Gridiron Edge

create table if not exists teams (
  id text primary key,
  name text not null,
  abbr text not null unique
);

create table if not exists games (
  id text primary key,
  season int not null,
  week int not null,
  kickoff timestamptz not null,
  home text references teams(id),
  away text references teams(id)
);

create table if not exists odds (
  game_id text references games(id) primary key,
  home_spread numeric not null,
  total numeric not null,
  implied_home numeric not null,
  implied_away numeric not null,
  source text not null,
  as_of timestamptz not null default now()
);

create table if not exists players (
  id text primary key,
  name text not null,
  team text references teams(id),
  pos text check (pos in ('QB','RB','WR','TE'))
);

create table if not exists roles (
  player_id text references players(id) primary key,
  routes_per_game numeric,
  target_share numeric,
  rush_share numeric,
  redzone_share numeric,
  baseline_yds_pg numeric,
  last4_yds_pg numeric,
  updated_at timestamptz default now()
);

create table if not exists defense_vs_pos (
  team text references teams(id),
  pos text check (pos in ('QB','RB','WR','TE')),
  epa_per_play_allowed numeric,
  success_rate_allowed numeric,
  yds_pg_allowed numeric,
  primary key (team, pos),
  updated_at timestamptz default now()
);
