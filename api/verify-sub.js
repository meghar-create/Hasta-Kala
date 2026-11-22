const{handler,rzp,sigOk,fail,applySub}=require('./_lib');
module.exports=handler(async(b,db,u)=>{if(!sigOk(b.razorpay_order_id,b.razorpay_payment_id,b.razorpay_signature))throw fail('Invalid payment signature',400);
const ro=await rzp('/orders/'+b.razorpay_order_id),sid=+ro.notes?.shop_id;
const{data:p}=await db.from('profiles').select('role,shop_id').eq('id',u.id).single();if(p?.role!=='owner'||p.shop_id!==sid)throw fail('Not your shop',403);
await applySub(db,ro,b.razorpay_payment_id);return{ok:true}});
