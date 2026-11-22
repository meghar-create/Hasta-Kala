-- =====================================================================================
-- HASTA-KALA  |  DEMO / DUMMY DATA  (showcase only)
-- 8 shops  |  56 products  |  5 images per product (shipped in assets/demo/)  |  8 coupons
-- Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this -> Run.
--
--  * Run supabase/full_setup.sql FIRST (this file needs its tables and the 3 plans).
--  * Safe to run again: every row is inserted only if it is not already there.
--  * The database holds the English text. Hindi and Kannada for every shop / product /
--    description come from assets/js/i18n-demo.js (the same dictionary the rest of the site uses).
--  * To remove it all:  see the CLEAN-UP block at the very bottom.
-- =====================================================================================

-- 1. extra categories (the 5 starter ones already exist)
insert into categories(name) values ('Metalcraft'),('Paintings') on conflict (name) do nothing;

-- 2. shops (approved + live, no owner login needed; owner_id stays empty)
insert into shops(name,description,city,pincode,plan_id,approved,sub_status,sub_expires_at,
                  delivery_local_fee,delivery_far_fee,free_above,local_days,far_days,
                  ships_india,cod_enabled,pickup_enabled,pickup_address,phone,address,gstin)
select v.name,v.description,v.city,v.pincode,(select id from plans where name=v.plan),true,'active',now()+interval '1 year',
       v.lf,v.ff,v.fa,v.ld,v.fd,true,true,true,v.pickup,v.phone,v.address,v.gstin
from (values
  ('Channapatna Toy House','Colourful lacquered wooden toys turned by hand by Channapatna artisans, safe for children.','Channapatna','562160','Pro',40,90,999,'1-2','4-7','12 Toy Street, Channapatna 562160','9845000001','12 Toy Street, Channapatna, Karnataka 562160','29DEMOA0001A1Z1'),
  ('Mysuru Rosewood & Sandal Studio','Hand-carved rosewood inlay, sandalwood figurines and traditional Mysuru paintings.','Mysuru','570001','Pro',50,110,1999,'1-2','4-7','45 Devaraja Market Road, Mysuru 570001','9845000002','45 Devaraja Market Road, Mysuru, Karnataka 570001','29DEMOB0002B1Z2'),
  ('Ilkal Handloom Weavers','Authentic Ilkal sarees and handloom cotton from a weavers cooperative in northern Karnataka.','Ilkal','587125','Pro',50,100,2500,'2-3','5-8','8 Weavers Colony, Ilkal 587125','9845000003','8 Weavers Colony, Ilkal, Karnataka 587125','29DEMOC0003C1Z3'),
  ('Bidar Bidri Art Gallery','Silver-inlaid Bidriware, the 600-year-old metal craft of Bidar, made by master artisans.','Bidar','585401','Free',60,120,3000,'2-3','5-8','Gawan Chowk, Bidar 585401','9845000004','Gawan Chowk, Bidar, Karnataka 585401','29DEMOD0004D1Z4'),
  ('Kasuti Kala Kendra','Traditional Kasuti hand embroidery on handloom fabrics, stitched thread by thread in Dharwad.','Dharwad','580001','Free',40,90,1500,'1-2','4-7','27 Subhas Road, Dharwad 580001','9845000005','27 Subhas Road, Dharwad, Karnataka 580001','29DEMOE0005E1Z5'),
  ('Lambani Threads Sandur','Mirror-work and patchwork embroidery by Lambani women artisans of Sandur.','Sandur','583119','Free',50,110,2000,'2-3','5-8','Lambani Colony, Sandur 583119','9845000006','Lambani Colony, Sandur, Karnataka 583119','29DEMOF0006F1Z6'),
  ('Bengaluru Clay Studio','Handmade terracotta and ceramic pottery for kitchens, gardens and festivals.','Bengaluru','560034','Pro',30,80,999,'1-2','3-6','18 Craft Lane, Koramangala, Bengaluru 560034','9845000007','18 Craft Lane, Koramangala, Bengaluru 560034','29DEMOG0007G1Z7'),
  ('Udupi Brass & Temple Jewels','Pooja lamps, brass utensils and temple jewellery from coastal Karnataka.','Udupi','576101','Free',40,100,1500,'1-2','4-7','Car Street, Udupi 576101','9845000008','Car Street, Udupi, Karnataka 576101','29DEMOH0008H1Z8')
) as v(name,description,city,pincode,plan,lf,ff,fa,ld,fd,pickup,phone,address,gstin)
where not exists(select 1 from shops s where s.name=v.name);

-- 3. products (5 images each, hosted inside the site at /assets/demo/; image_url = first image for the store cards)
insert into products(shop_id,name,description,price,mrp,stock,category_id,image_url,images)
select s.id,v.name,v.description,v.price,v.mrp,v.stock,c.id,v.imgs[1],v.imgs
from (values
  ('Channapatna Toy House','Channapatna Wooden Rattle Set','Set of 3 colourful lacquered rattles, smooth and safe for babies.',349,449,40,'Woodcraft',array['/assets/demo/channapatna-wooden-rattle-set-1.svg','/assets/demo/channapatna-wooden-rattle-set-2.svg','/assets/demo/channapatna-wooden-rattle-set-3.svg','/assets/demo/channapatna-wooden-rattle-set-4.svg','/assets/demo/channapatna-wooden-rattle-set-5.svg']::text[]),
  ('Channapatna Toy House','Lacquered Spinning Top','A hand-turned wooden top painted with natural vegetable dyes.',149,199,80,'Woodcraft',array['/assets/demo/lacquered-spinning-top-1.svg','/assets/demo/lacquered-spinning-top-2.svg','/assets/demo/lacquered-spinning-top-3.svg','/assets/demo/lacquered-spinning-top-4.svg','/assets/demo/lacquered-spinning-top-5.svg']::text[]),
  ('Channapatna Toy House','Wooden Stacking Rings','Seven rainbow rings to stack on a pole, great for toddlers learning colours.',449,599,30,'Woodcraft',array['/assets/demo/wooden-stacking-rings-1.svg','/assets/demo/wooden-stacking-rings-2.svg','/assets/demo/wooden-stacking-rings-3.svg','/assets/demo/wooden-stacking-rings-4.svg','/assets/demo/wooden-stacking-rings-5.svg']::text[]),
  ('Channapatna Toy House','Pull-Along Wooden Elephant','A friendly elephant on wheels with a cotton pull string.',699,899,18,'Woodcraft',array['/assets/demo/pull-along-wooden-elephant-1.svg','/assets/demo/pull-along-wooden-elephant-2.svg','/assets/demo/pull-along-wooden-elephant-3.svg','/assets/demo/pull-along-wooden-elephant-4.svg','/assets/demo/pull-along-wooden-elephant-5.svg']::text[]),
  ('Channapatna Toy House','Lacquer Wood Bangles Set of 6','Lightweight bangles in bright festive colours, turned from a single piece of wood.',299,399,60,'Jewellery',array['/assets/demo/lacquer-wood-bangles-set-of-6-1.svg','/assets/demo/lacquer-wood-bangles-set-of-6-2.svg','/assets/demo/lacquer-wood-bangles-set-of-6-3.svg','/assets/demo/lacquer-wood-bangles-set-of-6-4.svg','/assets/demo/lacquer-wood-bangles-set-of-6-5.svg']::text[]),
  ('Channapatna Toy House','Wooden Alphabet Blocks','26 blocks with letters and pictures for early learning.',549,699,25,'Woodcraft',array['/assets/demo/wooden-alphabet-blocks-1.svg','/assets/demo/wooden-alphabet-blocks-2.svg','/assets/demo/wooden-alphabet-blocks-3.svg','/assets/demo/wooden-alphabet-blocks-4.svg','/assets/demo/wooden-alphabet-blocks-5.svg']::text[]),
  ('Channapatna Toy House','Lacquered Pen Stand','A neat desk pen stand with traditional Channapatna lacquer finish.',249,329,45,'Home Decor',array['/assets/demo/lacquered-pen-stand-1.svg','/assets/demo/lacquered-pen-stand-2.svg','/assets/demo/lacquered-pen-stand-3.svg','/assets/demo/lacquered-pen-stand-4.svg','/assets/demo/lacquered-pen-stand-5.svg']::text[]),
  ('Mysuru Rosewood & Sandal Studio','Rosewood Inlay Jewellery Box','Handcrafted rosewood box with intricate ivory-coloured inlay, lined with velvet.',1899,2499,12,'Woodcraft',array['/assets/demo/rosewood-inlay-jewellery-box-1.svg','/assets/demo/rosewood-inlay-jewellery-box-2.svg','/assets/demo/rosewood-inlay-jewellery-box-3.svg','/assets/demo/rosewood-inlay-jewellery-box-4.svg','/assets/demo/rosewood-inlay-jewellery-box-5.svg']::text[]),
  ('Mysuru Rosewood & Sandal Studio','Sandalwood Elephant Figurine','A small carved elephant with the soft natural fragrance of Mysuru sandalwood.',2499,2999,10,'Woodcraft',array['/assets/demo/sandalwood-elephant-figurine-1.svg','/assets/demo/sandalwood-elephant-figurine-2.svg','/assets/demo/sandalwood-elephant-figurine-3.svg','/assets/demo/sandalwood-elephant-figurine-4.svg','/assets/demo/sandalwood-elephant-figurine-5.svg']::text[]),
  ('Mysuru Rosewood & Sandal Studio','Rosewood Ganesha Idol','Hand-carved Ganesha for the pooja shelf or as a gift.',1299,1599,15,'Woodcraft',array['/assets/demo/rosewood-ganesha-idol-1.svg','/assets/demo/rosewood-ganesha-idol-2.svg','/assets/demo/rosewood-ganesha-idol-3.svg','/assets/demo/rosewood-ganesha-idol-4.svg','/assets/demo/rosewood-ganesha-idol-5.svg']::text[]),
  ('Mysuru Rosewood & Sandal Studio','Sandalwood Hand Fan','A folding fan of thin sandalwood slats that releases a cooling fragrance.',399,499,35,'Woodcraft',array['/assets/demo/sandalwood-hand-fan-1.svg','/assets/demo/sandalwood-hand-fan-2.svg','/assets/demo/sandalwood-hand-fan-3.svg','/assets/demo/sandalwood-hand-fan-4.svg','/assets/demo/sandalwood-hand-fan-5.svg']::text[]),
  ('Mysuru Rosewood & Sandal Studio','Inlaid Rosewood Coaster Set','Set of 6 coasters with a holder, finished to resist heat and water rings.',799,999,28,'Home Decor',array['/assets/demo/inlaid-rosewood-coaster-set-1.svg','/assets/demo/inlaid-rosewood-coaster-set-2.svg','/assets/demo/inlaid-rosewood-coaster-set-3.svg','/assets/demo/inlaid-rosewood-coaster-set-4.svg','/assets/demo/inlaid-rosewood-coaster-set-5.svg']::text[]),
  ('Mysuru Rosewood & Sandal Studio','Carved Rosewood Wall Panel','A floral wall panel carved by hand over several days.',3499,4299,6,'Home Decor',array['/assets/demo/carved-rosewood-wall-panel-1.svg','/assets/demo/carved-rosewood-wall-panel-2.svg','/assets/demo/carved-rosewood-wall-panel-3.svg','/assets/demo/carved-rosewood-wall-panel-4.svg','/assets/demo/carved-rosewood-wall-panel-5.svg']::text[]),
  ('Mysuru Rosewood & Sandal Studio','Mysuru Gold-Leaf Painting','Traditional Mysuru painting of Goddess Lakshmi with real gold leaf work.',4999,5999,5,'Paintings',array['/assets/demo/mysuru-gold-leaf-painting-1.svg','/assets/demo/mysuru-gold-leaf-painting-2.svg','/assets/demo/mysuru-gold-leaf-painting-3.svg','/assets/demo/mysuru-gold-leaf-painting-4.svg','/assets/demo/mysuru-gold-leaf-painting-5.svg']::text[]),
  ('Ilkal Handloom Weavers','Ilkal Cotton-Silk Saree Maroon','Classic Ilkal saree with a silk border and the traditional Topi Teni pallu.',3299,3999,14,'Textiles',array['/assets/demo/ilkal-cotton-silk-saree-maroon-1.svg','/assets/demo/ilkal-cotton-silk-saree-maroon-2.svg','/assets/demo/ilkal-cotton-silk-saree-maroon-3.svg','/assets/demo/ilkal-cotton-silk-saree-maroon-4.svg','/assets/demo/ilkal-cotton-silk-saree-maroon-5.svg']::text[]),
  ('Ilkal Handloom Weavers','Ilkal Saree with Kondi Border','Handloom saree whose border is joined to the body by the Kondi technique.',3799,4499,10,'Textiles',array['/assets/demo/ilkal-saree-with-kondi-border-1.svg','/assets/demo/ilkal-saree-with-kondi-border-2.svg','/assets/demo/ilkal-saree-with-kondi-border-3.svg','/assets/demo/ilkal-saree-with-kondi-border-4.svg','/assets/demo/ilkal-saree-with-kondi-border-5.svg']::text[]),
  ('Ilkal Handloom Weavers','Handloom Cotton Dupatta','Soft breathable cotton dupatta with a contrast woven border.',599,799,40,'Textiles',array['/assets/demo/handloom-cotton-dupatta-1.svg','/assets/demo/handloom-cotton-dupatta-2.svg','/assets/demo/handloom-cotton-dupatta-3.svg','/assets/demo/handloom-cotton-dupatta-4.svg','/assets/demo/handloom-cotton-dupatta-5.svg']::text[]),
  ('Ilkal Handloom Weavers','Handwoven Cotton Stole','Light stole in natural dyes, easy to carry through the year.',449,599,50,'Textiles',array['/assets/demo/handwoven-cotton-stole-1.svg','/assets/demo/handwoven-cotton-stole-2.svg','/assets/demo/handwoven-cotton-stole-3.svg','/assets/demo/handwoven-cotton-stole-4.svg','/assets/demo/handwoven-cotton-stole-5.svg']::text[]),
  ('Ilkal Handloom Weavers','Ilkal Silk Blouse Piece','A 90 cm blouse length woven in matching saree colours.',349,449,60,'Textiles',array['/assets/demo/ilkal-silk-blouse-piece-1.svg','/assets/demo/ilkal-silk-blouse-piece-2.svg','/assets/demo/ilkal-silk-blouse-piece-3.svg','/assets/demo/ilkal-silk-blouse-piece-4.svg','/assets/demo/ilkal-silk-blouse-piece-5.svg']::text[]),
  ('Ilkal Handloom Weavers','Handloom Table Runner','A 150 cm cotton runner that brings handloom checks to your dining table.',499,649,30,'Home Decor',array['/assets/demo/handloom-table-runner-1.svg','/assets/demo/handloom-table-runner-2.svg','/assets/demo/handloom-table-runner-3.svg','/assets/demo/handloom-table-runner-4.svg','/assets/demo/handloom-table-runner-5.svg']::text[]),
  ('Ilkal Handloom Weavers','Handwoven Napkin Set','Six absorbent cotton napkins, washable and long lasting.',399,499,35,'Home Decor',array['/assets/demo/handwoven-napkin-set-1.svg','/assets/demo/handwoven-napkin-set-2.svg','/assets/demo/handwoven-napkin-set-3.svg','/assets/demo/handwoven-napkin-set-4.svg','/assets/demo/handwoven-napkin-set-5.svg']::text[]),
  ('Bidar Bidri Art Gallery','Bidriware Flower Vase','Black-finished vase with pure silver inlay in a floral pattern.',2899,3499,9,'Metalcraft',array['/assets/demo/bidriware-flower-vase-1.svg','/assets/demo/bidriware-flower-vase-2.svg','/assets/demo/bidriware-flower-vase-3.svg','/assets/demo/bidriware-flower-vase-4.svg','/assets/demo/bidriware-flower-vase-5.svg']::text[]),
  ('Bidar Bidri Art Gallery','Bidriware Jewellery Box','A small round box with a tight lid and fine silver wire work.',1999,2499,12,'Metalcraft',array['/assets/demo/bidriware-jewellery-box-1.svg','/assets/demo/bidriware-jewellery-box-2.svg','/assets/demo/bidriware-jewellery-box-3.svg','/assets/demo/bidriware-jewellery-box-4.svg','/assets/demo/bidriware-jewellery-box-5.svg']::text[]),
  ('Bidar Bidri Art Gallery','Bidriware Paan Box','Traditional paan box with compartments, a family heirloom style piece.',3499,4199,7,'Metalcraft',array['/assets/demo/bidriware-paan-box-1.svg','/assets/demo/bidriware-paan-box-2.svg','/assets/demo/bidriware-paan-box-3.svg','/assets/demo/bidriware-paan-box-4.svg','/assets/demo/bidriware-paan-box-5.svg']::text[]),
  ('Bidar Bidri Art Gallery','Bidriware Pen Holder','A cylindrical pen holder that makes a lasting corporate gift.',899,1199,20,'Metalcraft',array['/assets/demo/bidriware-pen-holder-1.svg','/assets/demo/bidriware-pen-holder-2.svg','/assets/demo/bidriware-pen-holder-3.svg','/assets/demo/bidriware-pen-holder-4.svg','/assets/demo/bidriware-pen-holder-5.svg']::text[]),
  ('Bidar Bidri Art Gallery','Bidriware Coaster Set','Set of 4 metal coasters with a silver lotus motif.',1299,1599,16,'Metalcraft',array['/assets/demo/bidriware-coaster-set-1.svg','/assets/demo/bidriware-coaster-set-2.svg','/assets/demo/bidriware-coaster-set-3.svg','/assets/demo/bidriware-coaster-set-4.svg','/assets/demo/bidriware-coaster-set-5.svg']::text[]),
  ('Bidar Bidri Art Gallery','Bidriware Cufflinks','A pair of cufflinks with delicate silver inlay on a dark base.',799,999,30,'Jewellery',array['/assets/demo/bidriware-cufflinks-1.svg','/assets/demo/bidriware-cufflinks-2.svg','/assets/demo/bidriware-cufflinks-3.svg','/assets/demo/bidriware-cufflinks-4.svg','/assets/demo/bidriware-cufflinks-5.svg']::text[]),
  ('Bidar Bidri Art Gallery','Bidriware Wall Plate','A decorative 20 cm plate to hang on the wall.',1599,1999,11,'Home Decor',array['/assets/demo/bidriware-wall-plate-1.svg','/assets/demo/bidriware-wall-plate-2.svg','/assets/demo/bidriware-wall-plate-3.svg','/assets/demo/bidriware-wall-plate-4.svg','/assets/demo/bidriware-wall-plate-5.svg']::text[]),
  ('Kasuti Kala Kendra','Kasuti Cushion Cover','40 x 40 cm cotton cover with gopura and palanquin motifs.',449,599,40,'Home Decor',array['/assets/demo/kasuti-cushion-cover-1.svg','/assets/demo/kasuti-cushion-cover-2.svg','/assets/demo/kasuti-cushion-cover-3.svg','/assets/demo/kasuti-cushion-cover-4.svg','/assets/demo/kasuti-cushion-cover-5.svg']::text[]),
  ('Kasuti Kala Kendra','Kasuti Handloom Saree','Handloom saree with Kasuti work all along the pallu.',4299,4999,8,'Textiles',array['/assets/demo/kasuti-handloom-saree-1.svg','/assets/demo/kasuti-handloom-saree-2.svg','/assets/demo/kasuti-handloom-saree-3.svg','/assets/demo/kasuti-handloom-saree-4.svg','/assets/demo/kasuti-handloom-saree-5.svg']::text[]),
  ('Kasuti Kala Kendra','Kasuti Wall Hanging','A framed piece of fine Kasuti stitching on cotton.',1299,1699,14,'Home Decor',array['/assets/demo/kasuti-wall-hanging-1.svg','/assets/demo/kasuti-wall-hanging-2.svg','/assets/demo/kasuti-wall-hanging-3.svg','/assets/demo/kasuti-wall-hanging-4.svg','/assets/demo/kasuti-wall-hanging-5.svg']::text[]),
  ('Kasuti Kala Kendra','Kasuti Tote Bag','Sturdy canvas tote with a hand-embroidered Kasuti panel.',699,899,32,'Textiles',array['/assets/demo/kasuti-tote-bag-1.svg','/assets/demo/kasuti-tote-bag-2.svg','/assets/demo/kasuti-tote-bag-3.svg','/assets/demo/kasuti-tote-bag-4.svg','/assets/demo/kasuti-tote-bag-5.svg']::text[]),
  ('Kasuti Kala Kendra','Kasuti Handkerchief Set','Pack of 3 cotton handkerchiefs with small embroidered corners.',299,399,60,'Textiles',array['/assets/demo/kasuti-handkerchief-set-1.svg','/assets/demo/kasuti-handkerchief-set-2.svg','/assets/demo/kasuti-handkerchief-set-3.svg','/assets/demo/kasuti-handkerchief-set-4.svg','/assets/demo/kasuti-handkerchief-set-5.svg']::text[]),
  ('Kasuti Kala Kendra','Kasuti Table Mat Set','Four table mats embroidered in traditional red and black thread.',899,1149,20,'Home Decor',array['/assets/demo/kasuti-table-mat-set-1.svg','/assets/demo/kasuti-table-mat-set-2.svg','/assets/demo/kasuti-table-mat-set-3.svg','/assets/demo/kasuti-table-mat-set-4.svg','/assets/demo/kasuti-table-mat-set-5.svg']::text[]),
  ('Kasuti Kala Kendra','Kasuti Embroidered Stole','A soft stole with Kasuti borders on both ends.',799,999,26,'Textiles',array['/assets/demo/kasuti-embroidered-stole-1.svg','/assets/demo/kasuti-embroidered-stole-2.svg','/assets/demo/kasuti-embroidered-stole-3.svg','/assets/demo/kasuti-embroidered-stole-4.svg','/assets/demo/kasuti-embroidered-stole-5.svg']::text[]),
  ('Lambani Threads Sandur','Lambani Mirror-Work Clutch','A festive clutch with tiny mirrors sewn in by hand.',649,849,30,'Textiles',array['/assets/demo/lambani-mirror-work-clutch-1.svg','/assets/demo/lambani-mirror-work-clutch-2.svg','/assets/demo/lambani-mirror-work-clutch-3.svg','/assets/demo/lambani-mirror-work-clutch-4.svg','/assets/demo/lambani-mirror-work-clutch-5.svg']::text[]),
  ('Lambani Threads Sandur','Lambani Wall Hanging','Colourful patchwork hanging with mirrors and cowrie shells.',999,1299,18,'Home Decor',array['/assets/demo/lambani-wall-hanging-1.svg','/assets/demo/lambani-wall-hanging-2.svg','/assets/demo/lambani-wall-hanging-3.svg','/assets/demo/lambani-wall-hanging-4.svg','/assets/demo/lambani-wall-hanging-5.svg']::text[]),
  ('Lambani Threads Sandur','Lambani Patchwork Bedspread','A double-bed cotton spread, stitched from hundreds of embroidered pieces.',2799,3499,8,'Textiles',array['/assets/demo/lambani-patchwork-bedspread-1.svg','/assets/demo/lambani-patchwork-bedspread-2.svg','/assets/demo/lambani-patchwork-bedspread-3.svg','/assets/demo/lambani-patchwork-bedspread-4.svg','/assets/demo/lambani-patchwork-bedspread-5.svg']::text[]),
  ('Lambani Threads Sandur','Lambani Tribal Necklace','A bold necklace of beads, coins and mirror pieces.',799,999,22,'Jewellery',array['/assets/demo/lambani-tribal-necklace-1.svg','/assets/demo/lambani-tribal-necklace-2.svg','/assets/demo/lambani-tribal-necklace-3.svg','/assets/demo/lambani-tribal-necklace-4.svg','/assets/demo/lambani-tribal-necklace-5.svg']::text[]),
  ('Lambani Threads Sandur','Lambani Jhola Bag','A roomy shoulder bag with tassels and embroidered flowers.',899,1149,24,'Textiles',array['/assets/demo/lambani-jhola-bag-1.svg','/assets/demo/lambani-jhola-bag-2.svg','/assets/demo/lambani-jhola-bag-3.svg','/assets/demo/lambani-jhola-bag-4.svg','/assets/demo/lambani-jhola-bag-5.svg']::text[]),
  ('Lambani Threads Sandur','Lambani Cushion Cover','A square cover with dense stitching in red, yellow and blue.',499,649,36,'Home Decor',array['/assets/demo/lambani-cushion-cover-1.svg','/assets/demo/lambani-cushion-cover-2.svg','/assets/demo/lambani-cushion-cover-3.svg','/assets/demo/lambani-cushion-cover-4.svg','/assets/demo/lambani-cushion-cover-5.svg']::text[]),
  ('Lambani Threads Sandur','Lambani Coin Anklet','A pair of anklets with small coins that chime as you walk.',549,699,28,'Jewellery',array['/assets/demo/lambani-coin-anklet-1.svg','/assets/demo/lambani-coin-anklet-2.svg','/assets/demo/lambani-coin-anklet-3.svg','/assets/demo/lambani-coin-anklet-4.svg','/assets/demo/lambani-coin-anklet-5.svg']::text[]),
  ('Bengaluru Clay Studio','Terracotta Water Pot','A 10 litre matka that keeps water naturally cool in summer.',599,749,20,'Pottery',array['/assets/demo/terracotta-water-pot-1.svg','/assets/demo/terracotta-water-pot-2.svg','/assets/demo/terracotta-water-pot-3.svg','/assets/demo/terracotta-water-pot-4.svg','/assets/demo/terracotta-water-pot-5.svg']::text[]),
  ('Bengaluru Clay Studio','Hand-Painted Ceramic Mug','A 300 ml mug with a hand-painted peacock design.',349,449,50,'Pottery',array['/assets/demo/hand-painted-ceramic-mug-1.svg','/assets/demo/hand-painted-ceramic-mug-2.svg','/assets/demo/hand-painted-ceramic-mug-3.svg','/assets/demo/hand-painted-ceramic-mug-4.svg','/assets/demo/hand-painted-ceramic-mug-5.svg']::text[]),
  ('Bengaluru Clay Studio','Terracotta Planter Set','Three planters in graded sizes with drainage holes.',799,999,25,'Home Decor',array['/assets/demo/terracotta-planter-set-1.svg','/assets/demo/terracotta-planter-set-2.svg','/assets/demo/terracotta-planter-set-3.svg','/assets/demo/terracotta-planter-set-4.svg','/assets/demo/terracotta-planter-set-5.svg']::text[]),
  ('Bengaluru Clay Studio','Clay Diya Set','Twelve hand-turned diyas for Deepavali and daily pooja.',199,249,100,'Pottery',array['/assets/demo/clay-diya-set-1.svg','/assets/demo/clay-diya-set-2.svg','/assets/demo/clay-diya-set-3.svg','/assets/demo/clay-diya-set-4.svg','/assets/demo/clay-diya-set-5.svg']::text[]),
  ('Bengaluru Clay Studio','Terracotta Tea Cups','Set of 4 earthy cups that add a fresh clay aroma to tea.',399,499,40,'Pottery',array['/assets/demo/terracotta-tea-cups-1.svg','/assets/demo/terracotta-tea-cups-2.svg','/assets/demo/terracotta-tea-cups-3.svg','/assets/demo/terracotta-tea-cups-4.svg','/assets/demo/terracotta-tea-cups-5.svg']::text[]),
  ('Bengaluru Clay Studio','Ceramic Serving Bowl','A glazed bowl safe for microwave and dishwasher.',549,699,30,'Pottery',array['/assets/demo/ceramic-serving-bowl-1.svg','/assets/demo/ceramic-serving-bowl-2.svg','/assets/demo/ceramic-serving-bowl-3.svg','/assets/demo/ceramic-serving-bowl-4.svg','/assets/demo/ceramic-serving-bowl-5.svg']::text[]),
  ('Bengaluru Clay Studio','Terracotta Wall Hanging','Hand-moulded sun face to hang on a garden or entrance wall.',699,899,15,'Home Decor',array['/assets/demo/terracotta-wall-hanging-1.svg','/assets/demo/terracotta-wall-hanging-2.svg','/assets/demo/terracotta-wall-hanging-3.svg','/assets/demo/terracotta-wall-hanging-4.svg','/assets/demo/terracotta-wall-hanging-5.svg']::text[]),
  ('Udupi Brass & Temple Jewels','Brass Diya Lamp','A heavy brass lamp with a wide base that stays steady.',899,1149,25,'Metalcraft',array['/assets/demo/brass-diya-lamp-1.svg','/assets/demo/brass-diya-lamp-2.svg','/assets/demo/brass-diya-lamp-3.svg','/assets/demo/brass-diya-lamp-4.svg','/assets/demo/brass-diya-lamp-5.svg']::text[]),
  ('Udupi Brass & Temple Jewels','Brass Hanging Lamp','A traditional chain-hung lamp for temples and entrances.',1799,2299,10,'Metalcraft',array['/assets/demo/brass-hanging-lamp-1.svg','/assets/demo/brass-hanging-lamp-2.svg','/assets/demo/brass-hanging-lamp-3.svg','/assets/demo/brass-hanging-lamp-4.svg','/assets/demo/brass-hanging-lamp-5.svg']::text[]),
  ('Udupi Brass & Temple Jewels','Brass Pooja Thali Set','Complete 7-piece pooja set with plate, bell, lamp and kumkum holders.',1499,1899,15,'Metalcraft',array['/assets/demo/brass-pooja-thali-set-1.svg','/assets/demo/brass-pooja-thali-set-2.svg','/assets/demo/brass-pooja-thali-set-3.svg','/assets/demo/brass-pooja-thali-set-4.svg','/assets/demo/brass-pooja-thali-set-5.svg']::text[]),
  ('Udupi Brass & Temple Jewels','Temple Jewellery Necklace Set','Gold-tone necklace with matching earrings, inspired by temple carvings.',1299,1699,20,'Jewellery',array['/assets/demo/temple-jewellery-necklace-set-1.svg','/assets/demo/temple-jewellery-necklace-set-2.svg','/assets/demo/temple-jewellery-necklace-set-3.svg','/assets/demo/temple-jewellery-necklace-set-4.svg','/assets/demo/temple-jewellery-necklace-set-5.svg']::text[]),
  ('Udupi Brass & Temple Jewels','Brass Pooja Bell','A clear-toned hand bell with a carved Nandi handle.',449,599,40,'Metalcraft',array['/assets/demo/brass-pooja-bell-1.svg','/assets/demo/brass-pooja-bell-2.svg','/assets/demo/brass-pooja-bell-3.svg','/assets/demo/brass-pooja-bell-4.svg','/assets/demo/brass-pooja-bell-5.svg']::text[]),
  ('Udupi Brass & Temple Jewels','Silver-Plated Jhumka Earrings','Lightweight jhumkas with tiny bells, suitable for daily wear.',499,649,38,'Jewellery',array['/assets/demo/silver-plated-jhumka-earrings-1.svg','/assets/demo/silver-plated-jhumka-earrings-2.svg','/assets/demo/silver-plated-jhumka-earrings-3.svg','/assets/demo/silver-plated-jhumka-earrings-4.svg','/assets/demo/silver-plated-jhumka-earrings-5.svg']::text[]),
  ('Udupi Brass & Temple Jewels','Brass Urli Bowl','A wide shallow bowl for floating flowers and candles.',1199,1499,14,'Home Decor',array['/assets/demo/brass-urli-bowl-1.svg','/assets/demo/brass-urli-bowl-2.svg','/assets/demo/brass-urli-bowl-3.svg','/assets/demo/brass-urli-bowl-4.svg','/assets/demo/brass-urli-bowl-5.svg']::text[])
) as v(shop,name,description,price,mrp,stock,cat,imgs)
join shops s on s.name=v.shop
join categories c on c.name=v.cat
where not exists(select 1 from products p where p.shop_id=s.id and p.name=v.name);

-- 4. one welcome coupon per demo shop (10% off orders above 500, max 200)
insert into coupons(shop_id,code,kind,value,min_order,max_discount,usage_limit)
select s.id,'WELCOME10','percent',10,500,200,1000 from shops s
where s.name in ('Channapatna Toy House','Mysuru Rosewood & Sandal Studio','Ilkal Handloom Weavers','Bidar Bidri Art Gallery','Kasuti Kala Kendra','Lambani Threads Sandur','Bengaluru Clay Studio','Udupi Brass & Temple Jewels')
on conflict (shop_id,code) do nothing;

-- 5. quick check (should show 8 shops and 56 products)
select (select count(*) from shops    where name in ('Channapatna Toy House','Mysuru Rosewood & Sandal Studio','Ilkal Handloom Weavers','Bidar Bidri Art Gallery','Kasuti Kala Kendra','Lambani Threads Sandur','Bengaluru Clay Studio','Udupi Brass & Temple Jewels')) as demo_shops,
       (select count(*) from products where shop_id in (select id from shops where name in ('Channapatna Toy House','Mysuru Rosewood & Sandal Studio','Ilkal Handloom Weavers','Bidar Bidri Art Gallery','Kasuti Kala Kendra','Lambani Threads Sandur','Bengaluru Clay Studio','Udupi Brass & Temple Jewels'))) as demo_products;

-- 5b. FIX FOR ALREADY-INSERTED DEMO DATA: if you ran an older version of this file, the photos were
--     remote (loremflickr) links that do not load. This re-points every demo product to the photos that
--     now ship inside the site (assets/demo/*.svg). Safe to run any number of times.
update products p set image_url='/assets/demo/'||v.slug||'-1.svg',
       images=array(select '/assets/demo/'||v.slug||'-'||g||'.svg' from generate_series(1,5) g)
from (values
  ('Channapatna Wooden Rattle Set','channapatna-wooden-rattle-set'),
  ('Lacquered Spinning Top','lacquered-spinning-top'),
  ('Wooden Stacking Rings','wooden-stacking-rings'),
  ('Pull-Along Wooden Elephant','pull-along-wooden-elephant'),
  ('Lacquer Wood Bangles Set of 6','lacquer-wood-bangles-set-of-6'),
  ('Wooden Alphabet Blocks','wooden-alphabet-blocks'),
  ('Lacquered Pen Stand','lacquered-pen-stand'),
  ('Rosewood Inlay Jewellery Box','rosewood-inlay-jewellery-box'),
  ('Sandalwood Elephant Figurine','sandalwood-elephant-figurine'),
  ('Rosewood Ganesha Idol','rosewood-ganesha-idol'),
  ('Sandalwood Hand Fan','sandalwood-hand-fan'),
  ('Inlaid Rosewood Coaster Set','inlaid-rosewood-coaster-set'),
  ('Carved Rosewood Wall Panel','carved-rosewood-wall-panel'),
  ('Mysuru Gold-Leaf Painting','mysuru-gold-leaf-painting'),
  ('Ilkal Cotton-Silk Saree Maroon','ilkal-cotton-silk-saree-maroon'),
  ('Ilkal Saree with Kondi Border','ilkal-saree-with-kondi-border'),
  ('Handloom Cotton Dupatta','handloom-cotton-dupatta'),
  ('Handwoven Cotton Stole','handwoven-cotton-stole'),
  ('Ilkal Silk Blouse Piece','ilkal-silk-blouse-piece'),
  ('Handloom Table Runner','handloom-table-runner'),
  ('Handwoven Napkin Set','handwoven-napkin-set'),
  ('Bidriware Flower Vase','bidriware-flower-vase'),
  ('Bidriware Jewellery Box','bidriware-jewellery-box'),
  ('Bidriware Paan Box','bidriware-paan-box'),
  ('Bidriware Pen Holder','bidriware-pen-holder'),
  ('Bidriware Coaster Set','bidriware-coaster-set'),
  ('Bidriware Cufflinks','bidriware-cufflinks'),
  ('Bidriware Wall Plate','bidriware-wall-plate'),
  ('Kasuti Cushion Cover','kasuti-cushion-cover'),
  ('Kasuti Handloom Saree','kasuti-handloom-saree'),
  ('Kasuti Wall Hanging','kasuti-wall-hanging'),
  ('Kasuti Tote Bag','kasuti-tote-bag'),
  ('Kasuti Handkerchief Set','kasuti-handkerchief-set'),
  ('Kasuti Table Mat Set','kasuti-table-mat-set'),
  ('Kasuti Embroidered Stole','kasuti-embroidered-stole'),
  ('Lambani Mirror-Work Clutch','lambani-mirror-work-clutch'),
  ('Lambani Wall Hanging','lambani-wall-hanging'),
  ('Lambani Patchwork Bedspread','lambani-patchwork-bedspread'),
  ('Lambani Tribal Necklace','lambani-tribal-necklace'),
  ('Lambani Jhola Bag','lambani-jhola-bag'),
  ('Lambani Cushion Cover','lambani-cushion-cover'),
  ('Lambani Coin Anklet','lambani-coin-anklet'),
  ('Terracotta Water Pot','terracotta-water-pot'),
  ('Hand-Painted Ceramic Mug','hand-painted-ceramic-mug'),
  ('Terracotta Planter Set','terracotta-planter-set'),
  ('Clay Diya Set','clay-diya-set'),
  ('Terracotta Tea Cups','terracotta-tea-cups'),
  ('Ceramic Serving Bowl','ceramic-serving-bowl'),
  ('Terracotta Wall Hanging','terracotta-wall-hanging'),
  ('Brass Diya Lamp','brass-diya-lamp'),
  ('Brass Hanging Lamp','brass-hanging-lamp'),
  ('Brass Pooja Thali Set','brass-pooja-thali-set'),
  ('Temple Jewellery Necklace Set','temple-jewellery-necklace-set'),
  ('Brass Pooja Bell','brass-pooja-bell'),
  ('Silver-Plated Jhumka Earrings','silver-plated-jhumka-earrings'),
  ('Brass Urli Bowl','brass-urli-bowl')
) as v(name,slug)
where p.name=v.name and p.shop_id in (select id from shops where name in ('Channapatna Toy House','Mysuru Rosewood & Sandal Studio','Ilkal Handloom Weavers','Bidar Bidri Art Gallery','Kasuti Kala Kendra','Lambani Threads Sandur','Bengaluru Clay Studio','Udupi Brass & Temple Jewels'));

-- -------------------------------------------------------------------------------------
-- CLEAN-UP: remove ALL demo data (products, coupons and orders of these shops go with them)
-- delete from shops where name in ('Channapatna Toy House','Mysuru Rosewood & Sandal Studio','Ilkal Handloom Weavers','Bidar Bidri Art Gallery','Kasuti Kala Kendra','Lambani Threads Sandur','Bengaluru Clay Studio','Udupi Brass & Temple Jewels');
-- -------------------------------------------------------------------------------------
