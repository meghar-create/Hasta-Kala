const{handler,sigOk,fail,markOrderPaid}=require('./_lib');
module.exports=handler(async(b,db,u)=>{const{data:o}=await db.from('orders').select('*').eq('id',b.order_id).single();
if(!o||o.user_id!==u.id||o.razorpay_order_id!==b.razorpay_order_id)throw fail('Order mismatch',400);
if(!sigOk(b.razorpay_order_id,b.razorpay_payment_id,b.razorpay_signature))throw fail('Invalid payment signature',400);
const st=await markOrderPaid(db,o,b.razorpay_payment_id);
if(st==='refund_due')throw fail('This order expired before your payment arrived, so it will be refunded. Please place the order again.',409);
return{ok:true}});
