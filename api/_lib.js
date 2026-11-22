const{createClient}=require('@supabase/supabase-js'),crypto=require('crypto');
const env=k=>{const v=process.env[k];if(!v)throw new Error('Server is missing env variable '+k);return v};
const fail=(m,status)=>Object.assign(new Error(m),{status});
const admin=()=>createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
async function who(req,db){const t=(req.headers.authorization||'').replace('Bearer ','');const{data,error}=await db.auth.getUser(t);if(error||!data.user)throw fail('Not logged in',401);return data.user}
async function rzp(path,body){const r=await fetch('https://api.razorpay.com/v1'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(env('RAZORPAY_KEY_ID')+':'+env('RAZORPAY_KEY_SECRET')).toString('base64')},body:body?JSON.stringify(body):undefined});
const j=await r.json();if(!r.ok)throw fail(j.error?.description||'Razorpay error',502);return j}
function sigOk(order,payment,sig){const h=crypto.createHmac('sha256',env('RAZORPAY_KEY_SECRET')).update(order+'|'+payment).digest('hex');return typeof sig==='string'&&h.length===sig.length&&crypto.timingSafeEqual(Buffer.from(h),Buffer.from(sig))}
const handler=fn=>async(req,res)=>{try{if(req.method!=='POST')throw fail('POST only',405);const db=admin(),u=await who(req,db);res.status(200).json(await fn(req.body||{},db,u))}catch(e){res.status(e.status||500).json({error:e.message})}};
const safeEq=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
async function rawBody(req){if(typeof req.rawBody==='string')return req.rawBody;if(Buffer.isBuffer(req.rawBody))return req.rawBody.toString('utf8');const c=[];for await(const x of req)c.push(Buffer.from(x));return Buffer.concat(c).toString('utf8')}
// Marks an online order paid exactly once. If the order was already cancelled/expired (stock released), flags it 'refund_due' instead.
async function markOrderPaid(db,o,paymentId){if(o.payment_status!=='pending')return o.payment_status;
const st=o.status==='cancelled'?'refund_due':'paid';
const{data,error}=await db.from('orders').update({payment_status:st,razorpay_payment_id:paymentId}).eq('id',o.id).eq('payment_status','pending').select('payment_status');
if(error)throw fail(error.message,500);return data?.[0]?.payment_status||st}
// Applies a subscription payment exactly once (razorpay_payment_id is unique). A suspended shop stays suspended.
async function applySub(db,ro,paymentId){const sid=+ro.notes?.shop_id,pid=+ro.notes?.plan_id;if(!sid||!pid)return false;
const{error:e1}=await db.from('sub_payments').insert({shop_id:sid,plan_id:pid,amount:ro.amount/100,months:1,razorpay_payment_id:paymentId});
if(e1){if(e1.code==='23505')return true;throw fail(e1.message,500)}
const{data:s}=await db.from('shops').select('sub_expires_at,sub_status').eq('id',sid).single();const d=new Date(Math.max(Date.now(),new Date(s.sub_expires_at)));d.setDate(d.getDate()+30);
const{error:e2}=await db.from('shops').update({plan_id:pid,sub_status:s.sub_status==='suspended'?'suspended':'active',sub_expires_at:d.toISOString()}).eq('id',sid);
if(e2){await db.from('sub_payments').delete().eq('razorpay_payment_id',paymentId);throw fail(e2.message,500)}return true}
module.exports={env,fail,rzp,sigOk,safeEq,rawBody,markOrderPaid,applySub,admin,handler};
