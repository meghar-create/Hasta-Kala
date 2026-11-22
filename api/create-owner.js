// Super admin creates a shop-owner account (+ the owner's shop, already approved). Owners cannot sign themselves up.
const{handler,fail}=require('./_lib');
const CITIES=['Bengaluru','Mysuru','Mangalore','Hubballi','Belagavi','Shivamogga'];   // keep in sync with CITIES in assets/js/app.js
module.exports=handler(async(b,db,u)=>{
const{data:me}=await db.from('profiles').select('role').eq('id',u.id).single();
if(me?.role!=='super_admin')throw fail('Only the super admin can create owner accounts',403);
const email=String(b.email||'').trim().toLowerCase(),pw=String(b.password||''),name=String(b.name||'').trim().slice(0,100),
shop=String(b.shop_name||'').trim().slice(0,100),city=String(b.city||'').trim().slice(0,100);
if(!/^\S+@\S+\.\S+$/.test(email))throw fail('Enter a valid email',400);
if(pw.length<8)throw fail('Password must be at least 8 characters',400);
if(!shop)throw fail('Enter the shop name',400);
if(!CITIES.includes(city))throw fail('Choose a city from the list',400);
const{data:c,error:e1}=await db.auth.admin.createUser({email,password:pw,email_confirm:true,user_metadata:{full_name:name}});
if(e1)throw fail(/already|registered|exists/i.test(e1.message)?'An account with this email already exists':e1.message,400);
const uid=c.user.id;
const undo=async m=>{await db.auth.admin.deleteUser(uid);throw fail(m,500)};
const{data:s,error:e2}=await db.from('shops').insert({name:shop,city,description:String(b.description||'').slice(0,300)||null,owner_id:uid,approved:true}).select('id').single();
if(e2)await undo(e2.message);
const{error:e3}=await db.from('profiles').update({role:'owner',shop_id:s.id,full_name:name||null}).eq('id',uid);
if(e3){await db.from('shops').delete().eq('id',s.id);await undo(e3.message)}
return{ok:true,shop_id:s.id}});
