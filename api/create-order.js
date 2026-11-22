const{handler,rzp,env,fail}=require('./_lib');
module.exports=handler(async(b,db,u)=>{const{data:o}=await db.from('orders').select('*').eq('id',b.order_id).single();
if(!o||o.user_id!==u.id)throw fail('Order not found',404);
if(o.payment_status!=='pending'||o.status==='cancelled')throw fail('This order is not awaiting payment',400);
// Reuse the Razorpay order if one exists, so the webhook can always match a payment to this order.
if(o.razorpay_order_id){const ex=await rzp('/orders/'+o.razorpay_order_id);
if(ex.status==='paid')throw fail('Payment already received. Your order will update in a moment.',409);
return{key:env('RAZORPAY_KEY_ID'),razorpay_order_id:ex.id,amount:ex.amount}}
const r=await rzp('/orders',{amount:Math.round(o.total*100),currency:'INR',receipt:'order_'+o.id});
await db.from('orders').update({razorpay_order_id:r.id}).eq('id',o.id);
return{key:env('RAZORPAY_KEY_ID'),razorpay_order_id:r.id,amount:r.amount}});
