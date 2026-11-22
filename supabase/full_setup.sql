-- =====================================================================================
-- HASTA-KALA  |  COMPLETE DATABASE SETUP (v2.4 + per-shop order numbers)  |  ONE FILE
-- Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this -> Run.
--
--   * Works on a brand-new project AND on a project that already has an older version.
--   * Safe to run again: it never deletes your data (no DROP TABLE anywhere).
--   * Replaces schema.sql + migration_v2_2.sql + migration_v2_3.sql (you do not need those).
-- =====================================================================================


-- =====================================================================================
-- 1. TABLES
-- =====================================================================================
create table if not exists plans(
  id serial primary key,
  name text not null,
  price numeric default 0,
  max_products int default 20,
  commission_pct numeric default 5);

create table if not exists shops(
  id serial primary key,
  name text not null,
  description text,
  city text,
  logo_url text,
  owner_id uuid references auth.users on delete set null,
  plan_id int references plans default 1,
  sub_status text default 'trial',
  sub_expires_at timestamptz default now()+interval '14 days',
  approved boolean default false,
  created_at timestamptz default now(),
  -- delivery settings (v2.3)
  pincode text check(pincode ~ '^[1-9][0-9]{5}$'),
  delivery_local_fee numeric not null default 0 check(delivery_local_fee>=0),
  delivery_far_fee numeric not null default 0 check(delivery_far_fee>=0),
  free_above numeric check(free_above>0),
  local_days text not null default '1-2' check(length(local_days) between 1 and 20),
  far_days text not null default '4-7' check(length(far_days) between 1 and 20),
  ships_india boolean not null default true,
  cod_enabled boolean not null default true,
  -- pickup from the store (v2.4)
  pickup_enabled boolean not null default true,
  pickup_address text check(length(pickup_address)<=300),
  -- shop details printed on bills (v2.5)
  phone text check(length(phone)<=20),
  address text check(length(address)<=300),
  gstin text check(length(gstin)<=20));

create table if not exists profiles(
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  phone text,
  role text default 'customer' check(role in('customer','staff','owner','super_admin')),
  shop_id int references shops on delete set null,
  staff_ok boolean default false,
  created_at timestamptz default now());

create table if not exists categories(
  id serial primary key,
  name text unique not null);

create table if not exists products(
  id serial primary key,
  shop_id int not null references shops on delete cascade,
  name text not null,
  description text,
  price numeric not null,
  mrp numeric,
  stock int default 0,
  category_id int references categories,
  image_url text,                       -- first image, kept for the store cards
  images text[] not null default '{}' check(cardinality(images)<=5),   -- up to 5 images (v2.4)
  created_at timestamptz default now());

create table if not exists orders(
  id serial primary key,
  shop_id int references shops,
  user_id uuid references auth.users,
  channel text default 'online',
  customer_name text,
  payment_method text,
  status text default 'placed',
  total numeric default 0,
  address jsonb,
  payment_status text default 'cod',
  razorpay_order_id text,
  razorpay_payment_id text,
  created_by uuid,
  created_at timestamptz default now(),
  -- v2.3
  discount numeric not null default 0,
  coupon_code text,
  delivery_fee numeric not null default 0,
  courier text,
  tracking_no text,
  -- delivery = shipped to the customer, pickup = customer collects from the store, counter = sold at the shop counter (v2.4)
  fulfilment text not null default 'delivery' check(fulfilment in('delivery','pickup','counter')));

create table if not exists order_items(
  id serial primary key,
  order_id int references orders on delete cascade,
  product_id int references products on delete set null,
  name text,
  price numeric,
  qty int);

create table if not exists reviews(
  id serial primary key,
  product_id int references products on delete cascade,
  user_id uuid references auth.users,
  rating int check(rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(product_id,user_id));

create table if not exists sub_payments(
  id serial primary key,
  shop_id int references shops on delete cascade,
  plan_id int references plans,
  amount numeric,
  months int default 1,
  razorpay_payment_id text unique,
  paid_at timestamptz default now());

create table if not exists addresses(
  id serial primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  label text not null default 'Home' check(label in('Home','Work','Other')),
  name text not null check(length(name) between 1 and 100),
  phone text not null check(phone ~ '^[6-9][0-9]{9}$'),
  address text not null check(length(address) between 3 and 300),
  city text not null check(length(city) between 1 and 100),
  pincode text not null check(pincode ~ '^[1-9][0-9]{5}$'),
  is_default boolean not null default false,
  created_at timestamptz default now());

create table if not exists wishlist(
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  product_id int not null references products on delete cascade,
  created_at timestamptz default now(),
  primary key(user_id,product_id));

create table if not exists coupons(
  id serial primary key,
  shop_id int not null references shops on delete cascade,
  code text not null check(code ~ '^[A-Z0-9_-]{3,20}$'),
  kind text not null check(kind in('percent','flat')),
  value numeric not null check(value>0),
  min_order numeric not null default 0 check(min_order>=0),
  max_discount numeric check(max_discount>0),
  usage_limit int check(usage_limit>0),
  used_count int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz default now(),
  unique(shop_id,code),
  check(kind<>'percent' or value<=100));

create table if not exists coupon_redemptions(
  id serial primary key,
  coupon_id int not null references coupons on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  order_id int not null unique references orders on delete cascade,
  created_at timestamptz default now());

create table if not exists order_events(
  id serial primary key,
  order_id int not null references orders on delete cascade,
  status text not null,
  created_at timestamptz not null default now());

create table if not exists contact_messages(
  id serial primary key,
  name text not null check(length(name) between 1 and 100),
  email text not null check(email ~ '^\S+@\S+\.\S+$' and length(email)<=200),
  subject text check(length(subject)<=150),
  message text not null check(length(message) between 5 and 2000),
  created_at timestamptz default now());

-- Upgrading an older project? These add any column an older version did not have (no-op on a fresh project).
alter table profiles add column if not exists staff_ok boolean default false;
alter table shops  add column if not exists pincode text check(pincode ~ '^[1-9][0-9]{5}$');
alter table shops  add column if not exists delivery_local_fee numeric not null default 0 check(delivery_local_fee>=0);
alter table shops  add column if not exists delivery_far_fee numeric not null default 0 check(delivery_far_fee>=0);
alter table shops  add column if not exists free_above numeric check(free_above>0);
alter table shops  add column if not exists local_days text not null default '1-2' check(length(local_days) between 1 and 20);
alter table shops  add column if not exists far_days text not null default '4-7' check(length(far_days) between 1 and 20);
alter table shops  add column if not exists ships_india boolean not null default true;
alter table shops  add column if not exists phone text check(length(phone)<=20);
alter table shops  add column if not exists address text check(length(address)<=300);
alter table shops  add column if not exists gstin text check(length(gstin)<=20);
alter table shops  add column if not exists cod_enabled boolean not null default true;
alter table orders add column if not exists discount numeric not null default 0;
alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists delivery_fee numeric not null default 0;
alter table orders add column if not exists courier text;
alter table orders add column if not exists tracking_no text;
alter table orders add column if not exists fulfilment text not null default 'delivery' check(fulfilment in('delivery','pickup','counter'));
alter table shops  add column if not exists pickup_enabled boolean not null default true;
alter table shops  add column if not exists pickup_address text check(length(pickup_address)<=300);
alter table products add column if not exists images text[] not null default '{}' check(cardinality(images)<=5);

create unique index if not exists coupon_once_per_user on coupon_redemptions(coupon_id,user_id);
create index if not exists addresses_user_idx on addresses(user_id);
create index if not exists order_events_order_idx on order_events(order_id);
create index if not exists orders_pending_idx on orders(created_at) where payment_status='pending' and status<>'cancelled';


-- =====================================================================================
-- 2. HELPER FUNCTIONS (who am I, is this shop open for business)
-- =====================================================================================
create or replace function my_role() returns text language sql security definer stable set search_path=public as $$
  select role from profiles where id=auth.uid()$$;

create or replace function my_shop() returns int language sql security definer stable set search_path=public as $$
  select shop_id from profiles where id=auth.uid()$$;

create or replace function is_super() returns boolean language sql security definer stable set search_path=public as $$
  select coalesce(my_role()='super_admin',false)$$;

create or replace function shop_live(sid int) returns boolean language sql security definer stable set search_path=public as $$
  select exists(select 1 from shops s join plans p on p.id=s.plan_id
    where s.id=sid and s.approved and s.sub_status<>'suspended' and (p.price=0 or s.sub_expires_at>now()))$$;

create or replace function has_received(pid int) returns boolean language sql security definer stable set search_path=public as $$
  select exists(select 1 from order_items oi join orders o on o.id=oi.order_id
    where oi.product_id=pid and o.user_id=auth.uid() and o.status='delivered')$$;


-- =====================================================================================
-- 3. TRIGGERS (automatic rules)
-- =====================================================================================
-- 3.1 every new login gets a profile row
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,email,full_name)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end$$;
drop trigger if exists on_signup on auth.users;
create trigger on_signup after insert on auth.users for each row execute function handle_new_user();

-- 3.2 customers cannot promote themselves (role / shop / email are locked unless super admin)
create or replace function profiles_guard() returns trigger language plpgsql as $$
begin
  if current_user in('authenticated','anon') and not is_super() then
    new.role:=old.role; new.shop_id:=old.shop_id; new.email:=old.email;
  end if;
  return new;
end$$;
drop trigger if exists t_pg on profiles;
create trigger t_pg before update on profiles for each row execute function profiles_guard();

-- 3.3 shop owners cannot change their own plan / approval / subscription
create or replace function shops_guard() returns trigger language plpgsql as $$
begin
  if current_user in('authenticated','anon') and not is_super() then
    new.owner_id:=old.owner_id; new.plan_id:=old.plan_id; new.sub_status:=old.sub_status;
    new.sub_expires_at:=old.sub_expires_at; new.approved:=old.approved;
  end if;
  return new;
end$$;
drop trigger if exists t_sg on shops;
create trigger t_sg before update on shops for each row execute function shops_guard();

-- 3.4 plan product limit
create or replace function prod_limit() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (select count(*) from products where shop_id=new.shop_id)
     >= (select p.max_products from shops s join plans p on p.id=s.plan_id where s.id=new.shop_id) then
    raise exception 'Plan product limit reached. Upgrade your plan.';
  end if;
  return new;
end$$;
drop trigger if exists t_pl on products;
create trigger t_pl before insert on products for each row execute function prod_limit();

-- 3.5 shop staff may only change status, courier and tracking number of an order
create or replace function orders_guard() returns trigger language plpgsql as $$
declare s text; c text; t text;
begin
  if current_user in('authenticated','anon') then
    if old.status='cancelled' and new.status<>'cancelled' then raise exception 'A cancelled order cannot be reopened'; end if;
    if not is_super() then
      s:=new.status;
      c:=nullif(left(trim(coalesce(new.courier,'')),60),'');
      t:=nullif(left(trim(coalesce(new.tracking_no,'')),200),'');
      if s not in('placed','packed','shipped','delivered','cancelled') then raise exception 'Invalid status'; end if;
      if s='shipped' and old.fulfilment<>'delivery' then raise exception 'Pickup and counter orders are not shipped. Use packed (ready) and delivered (collected).'; end if;
      new:=old; new.status:=s; new.courier:=c; new.tracking_no:=t;
    end if;
  end if;
  return new;
end$$;
drop trigger if exists t_og on orders;
create trigger t_og before update on orders for each row execute function orders_guard();

-- 3.6 cancelled order -> stock goes back
create or replace function restock() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='cancelled' and old.status<>'cancelled' then
    update products p set stock=p.stock+oi.qty from order_items oi where oi.order_id=new.id and p.id=oi.product_id;
  end if;
  return new;
end$$;
drop trigger if exists t_restock on orders;
create trigger t_restock after update on orders for each row execute function restock();

-- 3.7 cancelled order -> coupon is given back
create or replace function release_coupon() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='cancelled' and old.status<>'cancelled' then
    with d as(delete from coupon_redemptions where order_id=new.id returning coupon_id)
    update coupons c set used_count=greatest(c.used_count-1,0) from d where c.id=d.coupon_id;
  end if;
  return new;
end$$;
drop trigger if exists t_rc on orders;
create trigger t_rc after update on orders for each row execute function release_coupon();

-- 3.8 order timeline
create or replace function log_order_event() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    insert into order_events(order_id,status) values(new.id,new.status);
  end if;
  return new;
end$$;
drop trigger if exists t_oe_i on orders;
create trigger t_oe_i after insert on orders for each row execute function log_order_event();
drop trigger if exists t_oe_u on orders;
create trigger t_oe_u after update of status on orders for each row execute function log_order_event();

-- 3.8b per-shop order numbers: each shop counts its own orders 1, 2, 3... (orders.id stays the internal unique key)
alter table orders add column if not exists shop_order_no int;

-- one counter row per shop (locked row = two simultaneous orders never get the same number)
create table if not exists shop_order_counter(shop_id int primary key references shops on delete cascade, last_no int not null default 0);
alter table shop_order_counter enable row level security;   -- no policies: only the trigger below can touch it

-- number the existing orders: oldest = 1 inside each shop
with n as (select id,row_number() over(partition by shop_id order by created_at,id) rn from orders where shop_order_no is null and shop_id is not null)
update orders o set shop_order_no=n.rn from n where o.id=n.id;

-- seed counters from the highest number now in use
insert into shop_order_counter(shop_id,last_no)
select shop_id,max(shop_order_no) from orders where shop_id is not null group by shop_id
on conflict(shop_id) do update set last_no=greatest(shop_order_counter.last_no,excluded.last_no);

create or replace function set_shop_order_no() returns trigger language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if new.shop_id is null then return new; end if;
  insert into shop_order_counter(shop_id,last_no) values(new.shop_id,1)
  on conflict(shop_id) do update set last_no=shop_order_counter.last_no+1
  returning last_no into n;
  new.shop_order_no:=n;
  return new;
end$$;
drop trigger if exists t_shop_order_no on orders;
create trigger t_shop_order_no before insert on orders for each row execute function set_shop_order_no();

create unique index if not exists orders_shop_no_uq on orders(shop_id,shop_order_no);

-- nobody may edit the number afterwards
create or replace function lock_shop_order_no() returns trigger language plpgsql as $$
begin if old.shop_order_no is not null then new.shop_order_no:=old.shop_order_no; end if; return new; end$$;
drop trigger if exists t_lock_shop_order_no on orders;
create trigger t_lock_shop_order_no before update on orders for each row execute function lock_shop_order_no();

-- 3.9 saved addresses: max 10 per customer, only one default
create or replace function addr_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' and (select count(*) from addresses where user_id=new.user_id)>=10 then
    raise exception 'You can save up to 10 addresses';
  end if;
  if new.is_default then
    update addresses set is_default=false where user_id=new.user_id and id is distinct from new.id and is_default;
  end if;
  return new;
end$$;
drop trigger if exists t_ad on addresses;
create trigger t_ad before insert or update on addresses for each row execute function addr_guard();

-- 3.10 coupons: shop owners cannot fake used_count; codes are always upper case
create or replace function coupons_guard() returns trigger language plpgsql as $$
begin
  if current_user in('authenticated','anon') then
    new.used_count:=case when tg_op='INSERT' then 0 else old.used_count end;
  end if;
  new.code:=upper(new.code);
  return new;
end$$;
drop trigger if exists t_cg on coupons;
create trigger t_cg before insert or update on coupons for each row execute function coupons_guard();


-- =====================================================================================
-- 4. BUSINESS FUNCTIONS (called by the website)
-- =====================================================================================
-- remove old signatures from earlier versions first (safe even if they do not exist)
drop function if exists make_order(int,uuid,text,jsonb,jsonb,text,text,text);
drop function if exists make_order(int,uuid,text,jsonb,jsonb,text,text,text,text);
drop function if exists place_order(int,jsonb,jsonb,text);
drop function if exists place_order(int,jsonb,jsonb,text,text);
drop function if exists pos_sale(jsonb,text,text);
drop function if exists calc_coupon(int,text,uuid,numeric);
drop function if exists delivery_calc(int,text,numeric);

-- 4.1 unpaid online orders are cancelled after 60 minutes (stock is released by the restock trigger)
create or replace function expire_pending_orders(mins int default 60) returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  update orders set status='cancelled'
   where channel='online' and payment_method='Online' and payment_status='pending'
     and status<>'cancelled' and created_at<now()-make_interval(mins=>mins);
  get diagnostics n=row_count;
  return n;
end$$;
revoke execute on function expire_pending_orders from public,anon,authenticated;

-- 4.2 delivery fee for a pincode ("local" = same first 3 digits as the shop's pincode)
create function delivery_calc(sid int,pin text,sub numeric,out fee numeric,out is_local boolean) language plpgsql security definer set search_path=public as $$
declare s shops;
begin
  select * into s from shops where id=sid;
  is_local:=s.pincode is not null and left(s.pincode,3)=left(coalesce(pin,''),3);
  if not is_local and not s.ships_india then
    raise exception 'This store delivers only near %. Please choose a different address or store.',coalesce(s.city,'its location');
  end if;
  fee:=case when s.free_above is not null and sub>=s.free_above then 0
            when is_local then s.delivery_local_fee else s.delivery_far_fee end;
end$$;
revoke execute on function delivery_calc from public,anon,authenticated;

-- 4.3 coupon check (server side only)
create function calc_coupon(sid int,cd text,uid uuid,sub numeric,out cid int,out disc numeric,out cc text) language plpgsql security definer set search_path=public as $$
declare c coupons; d numeric;
begin
  select * into c from coupons where shop_id=sid and code=upper(trim(coalesce(cd,''))) and active for update;
  if not found then raise exception 'Invalid coupon code'; end if;
  if c.expires_at is not null and c.expires_at<now() then raise exception 'This coupon has expired'; end if;
  if sub<c.min_order then raise exception 'Add items worth ₹% or more to use this coupon',c.min_order::numeric(12,0); end if;
  if c.usage_limit is not null and c.used_count>=c.usage_limit then raise exception 'This coupon has been fully used'; end if;
  if exists(select 1 from coupon_redemptions where coupon_id=c.id and user_id=uid) then raise exception 'You have already used this coupon'; end if;
  d:=case when c.kind='percent' then round(sub*c.value/100,2) else c.value end;
  if c.max_discount is not null then d:=least(d,c.max_discount); end if;
  cid:=c.id; disc:=least(d,sub); cc:=c.code;
end$$;
revoke execute on function calc_coupon from public,anon,authenticated;

-- 4.4 "Apply coupon" button in the cart
create or replace function check_coupon(sid int,items jsonb,cd text) returns jsonb language plpgsql security definer set search_path=public as $$
declare sub numeric; r record;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  select coalesce(sum(p.price*(i->>'qty')::int),0) into sub
    from jsonb_array_elements(items) i join products p on p.id=(i->>'id')::int and p.shop_id=sid
   where (i->>'qty')::int>0;
  select * into r from calc_coupon(sid,cd,auth.uid(),sub);
  return jsonb_build_object('subtotal',sub,'discount',r.disc);
end$$;

-- 4.5 the one function that creates every order (online + POS): checks stock, prices, coupon, delivery
--     fulfilment: delivery (shipped), pickup (customer collects) or counter (POS sale). pdisc = counter discount in rupees.
create or replace function make_order(sid int,uid uuid,ch text,items jsonb,addr jsonb,cust text,pay text,st text,cpn text default null,ful text default null,pdisc numeric default 0) returns int language plpgsql security definer set search_path=public as $$
declare oid int; i jsonb; p products; t numeric:=0; q int; r record; dr record; disc numeric:=0; df numeric:=0; cc text; fl text; sh shops;
begin
  perform expire_pending_orders();
  if not shop_live(sid) then raise exception 'This store is not accepting orders'; end if;
  select * into sh from shops where id=sid;
  fl:=coalesce(ful,case when ch='pos' then 'counter' else 'delivery' end);
  if (ch='pos' and fl<>'counter') or (ch='online' and fl not in('delivery','pickup')) then raise exception 'Invalid order type'; end if;
  if fl='pickup' and not sh.pickup_enabled then raise exception 'This store does not offer pickup. Please choose home delivery.'; end if;
  if fl='delivery' and ch='online' and pay='COD' and not sh.cod_enabled then
    raise exception 'This store does not accept cash on delivery. Please pay online.';
  end if;
  if coalesce(pdisc,0)<0 then raise exception 'Discount cannot be negative'; end if;
  insert into orders(shop_id,user_id,channel,address,customer_name,payment_method,status,payment_status,created_by,fulfilment)
  values(sid,uid,ch,addr,cust,pay,st,case when pay='Online' then 'pending' when ch='pos' then 'paid' else 'cod' end,auth.uid(),fl)
  returning id into oid;
  for i in select * from jsonb_array_elements(items) loop
    q:=(i->>'qty')::int;
    if q is null or q<1 then raise exception 'Bad quantity'; end if;
    select * into p from products where id=(i->>'id')::int and shop_id=sid for update;
    if not found then raise exception 'Product not in this store'; end if;
    if p.stock<q then raise exception 'Insufficient stock: %',p.name; end if;
    update products set stock=stock-q where id=p.id;
    insert into order_items(order_id,product_id,name,price,qty) values(oid,p.id,p.name,p.price,q);
    t:=t+p.price*q;
  end loop;
  if t<=0 then raise exception 'The bill is empty'; end if;
  if nullif(trim(coalesce(cpn,'')),'') is not null and ch='online' then
    select * into r from calc_coupon(sid,cpn,uid,t); disc:=r.disc; cc:=r.cc;
    insert into coupon_redemptions(coupon_id,user_id,order_id) values(r.cid,uid,oid);
    update coupons set used_count=used_count+1 where id=r.cid;
  end if;
  if ch='pos' and coalesce(pdisc,0)>0 then disc:=least(round(pdisc,2),t); end if;
  if ch='online' and fl='delivery' then
    select * into dr from delivery_calc(sid,addr->>'pincode',t); df:=dr.fee;
  end if;
  update orders set total=t-disc+df,discount=disc,coupon_code=cc,delivery_fee=df where id=oid;
  return oid;
end$$;
revoke execute on function make_order from public,anon,authenticated;

-- 4.6 customer checkout (home delivery or pickup from the store)
create or replace function place_order(sid int,items jsonb,addr jsonb,pay text default 'COD',cpn text default null,ful text default 'delivery') returns int language plpgsql security definer set search_path=public as $$
declare a jsonb; f text:=coalesce(ful,'delivery');
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if f not in('delivery','pickup') then raise exception 'Invalid order type'; end if;
  if f='pickup' then
    a:=jsonb_build_object('name',left(trim(coalesce(addr->>'name','')),100),'phone',trim(coalesce(addr->>'phone','')),'pickup',true);
    if a->>'name'='' then raise exception 'Please enter your name'; end if;
    if a->>'phone' !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit mobile number'; end if;
  else
    a:=jsonb_build_object('name',left(trim(coalesce(addr->>'name','')),100),'phone',trim(coalesce(addr->>'phone','')),
       'address',left(trim(coalesce(addr->>'address','')),300),'city',left(trim(coalesce(addr->>'city','')),100),
       'pincode',trim(coalesce(addr->>'pincode','')));
    if a->>'name'='' or length(a->>'address')<3 or a->>'city'='' then raise exception 'Please fill in the full delivery address'; end if;
    if a->>'phone' !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit mobile number'; end if;
    if a->>'pincode' !~ '^[1-9][0-9]{5}$' then raise exception 'Enter a valid 6-digit pincode'; end if;
  end if;
  return make_order(sid,auth.uid(),'online',items,a,a->>'name',case when pay='Online' then 'Online' else 'COD' end,'placed',cpn,f);
end$$;

-- 4.7 shop counter sale (POS): optional rupee discount
create or replace function pos_sale(items jsonb,cust text,pay text,disc numeric default 0) returns int language plpgsql security definer set search_path=public as $$
begin
  if my_role() not in('owner','staff') then raise exception 'Not allowed'; end if;
  if pay not in('Cash','UPI','Card') then raise exception 'Choose a payment mode'; end if;
  return make_order(my_shop(),null,'pos',items,null,coalesce(nullif(left(trim(cust),100),''),'Walk-in'),pay,'delivered',null,'counter',coalesce(disc,0));
end$$;

-- 4.8 customer cancels own order (only while still "placed")
create or replace function cancel_order(oid int) returns void language plpgsql security definer set search_path=public as $$
declare o orders;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  select * into o from orders where id=oid and user_id=auth.uid() and channel='online' for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status='cancelled' then return; end if;
  if o.status<>'placed' then raise exception 'This order has already been packed or shipped. Please contact us to cancel it.'; end if;
  update orders set status='cancelled',payment_status=case when payment_status='paid' then 'refund_due' else payment_status end where id=oid;
end$$;

-- 4.8b public reviews of a product (anyone can read; only the reviewer's first name is shown)
create or replace function product_reviews(pid int) returns table(id int,rating int,comment text,created_at timestamptz,reviewer text,mine boolean) language sql security definer stable set search_path=public as $$
  select r.id,r.rating,r.comment,r.created_at,
         coalesce(nullif(split_part(trim(coalesce(p.full_name,'')),' ',1),''),'Customer'),
         coalesce(r.user_id=auth.uid(),false)
    from reviews r left join profiles p on p.id=r.user_id
   where r.product_id=pid order by r.created_at desc limit 200$$;
grant execute on function product_reviews(int) to anon,authenticated;

-- 4.9 shops and staff
-- Owner accounts are created by the super admin and staff accounts by the owner (see api/create-owner.js and
-- api/create-staff.js), so these self-service functions from older versions are removed:
drop function if exists register_shop(text,text,text);
drop function if exists request_staff_access();
drop function if exists add_staff(text);

-- the owner can remove a staff member from the shop (the staff login becomes a normal customer account)
create or replace function remove_staff(uid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if my_role()<>'owner' then raise exception 'Owners only'; end if;
  update profiles set role='customer',shop_id=null,staff_ok=false where id=uid and shop_id=my_shop() and role='staff';
end$$;


-- =====================================================================================
-- 5. SECURITY (Row Level Security: who can see / change what)
-- =====================================================================================
alter table plans              enable row level security;
alter table shops              enable row level security;
alter table profiles           enable row level security;
alter table categories         enable row level security;
alter table products           enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table reviews            enable row level security;
alter table sub_payments       enable row level security;
alter table addresses          enable row level security;
alter table wishlist           enable row level security;
alter table coupons            enable row level security;
alter table coupon_redemptions enable row level security;   -- no policy on purpose: only the server functions use it
alter table order_events       enable row level security;
alter table contact_messages   enable row level security;

drop policy if exists pl_r on plans;      create policy pl_r on plans      for select using(true);
drop policy if exists pl_w on plans;      create policy pl_w on plans      for all using(is_super()) with check(is_super());

drop policy if exists sh_r on shops;      create policy sh_r on shops      for select using(shop_live(id) or owner_id=auth.uid() or id=my_shop() or is_super());
drop policy if exists sh_u on shops;      create policy sh_u on shops      for update using(owner_id=auth.uid() or is_super());
drop policy if exists sh_d on shops;      create policy sh_d on shops      for delete using(is_super());

drop policy if exists pf_r on profiles;   create policy pf_r on profiles   for select using(id=auth.uid() or is_super() or (my_role()='owner' and shop_id=my_shop()));
drop policy if exists pf_u on profiles;   create policy pf_u on profiles   for update using(id=auth.uid() or is_super());

drop policy if exists ct_r on categories; create policy ct_r on categories for select using(true);
drop policy if exists ct_w on categories; create policy ct_w on categories for all using(is_super()) with check(is_super());

drop policy if exists pd_r on products;   create policy pd_r on products   for select using(shop_live(shop_id) or shop_id=my_shop() or is_super());
drop policy if exists pd_w on products;   create policy pd_w on products   for all
  using(is_super() or (my_role()='owner' and shop_id=my_shop()))
  with check(is_super() or (my_role()='owner' and shop_id=my_shop()));

drop policy if exists or_r on orders;     create policy or_r on orders     for select using(user_id=auth.uid() or shop_id=my_shop() or is_super());
drop policy if exists or_u on orders;     create policy or_u on orders     for update using(is_super() or (shop_id=my_shop() and my_role() in('owner','staff')));

drop policy if exists oi_r on order_items; create policy oi_r on order_items for select using(exists(select 1 from orders o where o.id=order_id));

drop policy if exists rv_r on reviews;    create policy rv_r on reviews    for select using(true);
drop policy if exists rv_w on reviews;    create policy rv_w on reviews    for insert with check(user_id=auth.uid() and has_received(product_id));
drop policy if exists rv_d on reviews;    create policy rv_d on reviews    for delete using(user_id=auth.uid() or is_super());

drop policy if exists sp_r on sub_payments; create policy sp_r on sub_payments for select using(is_super() or (shop_id=my_shop() and my_role()='owner'));
drop policy if exists sp_w on sub_payments; create policy sp_w on sub_payments for all using(is_super()) with check(is_super());

drop policy if exists ad_all on addresses; create policy ad_all on addresses for all using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists wl_all on wishlist;  create policy wl_all on wishlist  for all using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists cp_w on coupons;    create policy cp_w on coupons    for all
  using(is_super() or (my_role()='owner' and shop_id=my_shop()))
  with check(is_super() or (my_role()='owner' and shop_id=my_shop()));

drop policy if exists oe_r on order_events; create policy oe_r on order_events for select using(exists(select 1 from orders o where o.id=order_id));

drop policy if exists cm_i on contact_messages; create policy cm_i on contact_messages for insert to anon,authenticated with check(true);
drop policy if exists cm_r on contact_messages; create policy cm_r on contact_messages for select using(is_super());
drop policy if exists cm_d on contact_messages; create policy cm_d on contact_messages for delete using(is_super());

-- table permissions for the newer tables
revoke all on addresses,wishlist,coupons,coupon_redemptions,order_events,contact_messages from anon;
grant select,insert,update,delete on addresses,wishlist,coupons,order_events,contact_messages to authenticated;
grant insert on contact_messages to anon;
grant usage,select on all sequences in schema public to anon,authenticated;


-- =====================================================================================
-- 6. STARTER DATA (only inserted when missing, never duplicated)
-- =====================================================================================
insert into plans(name,price,max_products,commission_pct)
select * from (values ('Free',0,20,5),('Pro',499,500,3),('Business',1499,100000,2)) v(name,price,max_products,commission_pct)
where not exists(select 1 from plans);

insert into categories(name) values('Pottery'),('Textiles'),('Jewellery'),('Woodcraft'),('Home Decor') on conflict (name) do nothing;

-- (no demo shop / demo products are created: add your own from the Owner > Inventory page)

-- people who signed up BEFORE this script ran get a profile too
insert into profiles(id,email,full_name)
select u.id,u.email,coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name') from auth.users u
where not exists(select 1 from profiles p where p.id=u.id);

-- timeline for orders that already existed
insert into order_events(order_id,status,created_at)
select o.id,s.st,o.created_at from orders o
cross join lateral(select 'placed'::text st union all select o.status where o.status<>'placed') s
where not exists(select 1 from order_events e where e.order_id=o.id);


-- products that only had a single image link keep it as their first image
update products set images=array[image_url] where cardinality(images)=0 and image_url is not null;
-- orders created before v2.4: counter sales are 'counter', everything else is home delivery
update orders set fulfilment='counter' where channel='pos' and fulfilment<>'counter';

-- product photo storage (Supabase Storage): public read, only the shop owner can upload into their own folder
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
      values('product-images','product-images',true,2097152,array['image/jpeg','image/png','image/webp'])
      on conflict (id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
    drop policy if exists pimg_read on storage.objects;
    create policy pimg_read on storage.objects for select using(bucket_id='product-images');
    drop policy if exists pimg_ins on storage.objects;
    create policy pimg_ins on storage.objects for insert to authenticated
      with check(bucket_id='product-images' and my_role()='owner' and (storage.foldername(name))[1]=my_shop()::text);
    drop policy if exists pimg_upd on storage.objects;
    create policy pimg_upd on storage.objects for update to authenticated
      using(bucket_id='product-images' and my_role()='owner' and (storage.foldername(name))[1]=my_shop()::text);
    drop policy if exists pimg_del on storage.objects;
    create policy pimg_del on storage.objects for delete to authenticated
      using(bucket_id='product-images' and my_role()='owner' and (storage.foldername(name))[1]=my_shop()::text);
  end if;
end $$;


-- =====================================================================================
-- 7. AFTER RUNNING: make yourself super admin
--    1) Open your website /login and sign up once (email or Google).
--    2) Then run this line in a NEW query with YOUR email:
--
--    update profiles set role='super_admin' where email='YOU@EMAIL.COM';
--
-- OPTIONAL: also expire unpaid online orders every 15 minutes (Database -> Extensions -> enable pg_cron):
--    select cron.schedule('expire-pending-orders','*/15 * * * *','select public.expire_pending_orders()');
-- =====================================================================================
