const{handler,rzp,env,fail}=require('./_lib');
module.exports=handler(async(b,db,u)=>{const{data:p}=await db.from('profiles').select('role,shop_id').eq('id',u.id).single();
if(p?.role!=='owner')throw fail('Only shop owners can subscribe',403);
const{data:pl}=await db.from('plans').select('*').eq('id',b.plan_id).single();if(!pl||!(pl.price>0))throw fail('Choose a paid plan',400);
const r=await rzp('/orders',{amount:Math.round(pl.price*100),currency:'INR',receipt:('sub_'+p.shop_id+'_'+Date.now()).slice(0,40),notes:{shop_id:String(p.shop_id),plan_id:String(pl.id)}});
return{key:env('RAZORPAY_KEY_ID'),razorpay_order_id:r.id,amount:r.amount}});
