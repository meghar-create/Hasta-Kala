// Razorpay -> server webhook. This is the source of truth for payments: it still marks the order paid
// if the customer closes the tab or loses network right after paying.
// Setup: Razorpay Dashboard -> Settings -> Webhooks -> URL https://YOUR-APP.vercel.app/api/razorpay-webhook,
// events: payment.captured + order.paid, secret -> env RAZORPAY_WEBHOOK_SECRET.
const crypto=require('crypto');const{env,rzp,safeEq,rawBody,markOrderPaid,applySub,admin}=require('./_lib');
module.exports=async(req,res)=>{try{
if(req.method!=='POST')return res.status(405).json({error:'POST only'});
const raw=await rawBody(req),want=crypto.createHmac('sha256',env('RAZORPAY_WEBHOOK_SECRET')).update(raw).digest('hex');
if(!safeEq(want,req.headers['x-razorpay-signature']))return res.status(400).json({error:'Invalid signature'});
const ev=JSON.parse(raw),pay=ev.payload?.payment?.entity;
if(!['payment.captured','order.paid'].includes(ev.event)||!pay?.order_id)return res.status(200).json({ok:true,ignored:true});
const db=admin();
const{data:o}=await db.from('orders').select('*').eq('razorpay_order_id',pay.order_id).maybeSingle();
if(o){if(Math.round(o.total*100)!==pay.amount)return res.status(200).json({ok:true,ignored:'amount mismatch'});
await markOrderPaid(db,o,pay.id);return res.status(200).json({ok:true})}
const ro=await rzp('/orders/'+pay.order_id);
if(ro.notes?.shop_id&&ro.notes?.plan_id&&ro.amount===pay.amount)await applySub(db,ro,pay.id);
return res.status(200).json({ok:true})}catch(e){res.status(500).json({error:e.message})}};
module.exports.config={api:{bodyParser:false}};
