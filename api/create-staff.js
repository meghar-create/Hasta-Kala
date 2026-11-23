// A shop owner creates a staff account for their own shop. Staff cannot sign themselves up.
const{handler,fail}=require('./_lib');
module.exports=handler(async(b,db,u)=>{
const{data:me,error:profileError}=await db.from('profiles').select('role,shop_id').eq('id',u.id).single();
if(profileError)throw fail('Could not verify the shop-owner profile: '+profileError.message,500);
if(!me)throw fail('No profile was found for this account',403);
if(me.role!=='owner')throw fail(`Only shop owners can create staff accounts (signed-in user ${u.id} has profile role "${me.role||'unset'}", shop ${me.shop_id??'none'})`,403);
if(!me.shop_id)throw fail('This shop-owner account has no shop assigned',403);
const email=String(b.email||'').trim().toLowerCase(),pw=String(b.password||''),name=String(b.name||'').trim().slice(0,100);
if(!/^\S+@\S+\.\S+$/.test(email))throw fail('Enter a valid email',400);
if(pw.length<8)throw fail('Password must be at least 8 characters',400);
const{count}=await db.from('profiles').select('id',{count:'exact',head:true}).eq('shop_id',me.shop_id).eq('role','staff');
if(count>=20)throw fail('You can have up to 20 staff accounts',400);
const{data:c,error:e1}=await db.auth.admin.createUser({email,password:pw,email_confirm:true,user_metadata:{full_name:name}});
if(e1)throw fail(/already|registered|exists/i.test(e1.message)?'An account with this email already exists':e1.message,400);
const{error:e2}=await db.from('profiles').update({role:'staff',shop_id:me.shop_id,full_name:name||null}).eq('id',c.user.id);
if(e2){await db.auth.admin.deleteUser(c.user.id);throw fail(e2.message,500)}
return{ok:true}});
