/* ---------- Mock backend (در نسخه‌ی نهایی حذف شود) ---------- */
let DB={cats:[[1,'داستانی','📖'],[2,'ماجراجویی','⛰️'],[3,'تاریخی','🏰'],[4,'علمی','🧪'],[5,'معمایی','🔍'],[6,'فانتزی','🪄']].map(c=>({id:c[0],name:c[1],icon:c[2]})),
books:[[1,'شازده کوچولو','آنتوان دو سنت اگزوپری',6,4,4.8],[2,'هفت گناه','آگاتا کریستی',5,2,4.5],[3,'ملت عشق','الیف شافاک',1,3,4.6],[4,'جزیره‌ی گنج','رابرت لوئیس استیونسون',2,3,4.3],[5,'سفر به مرکز زمین','ژول ورن',4,2,4.4],[6,'کیمیاگر','پائولو کوئیلو',1,3,4.5]].map(b=>({id:b[0],title:b[1],author:b[2],categoryId:b[3],copies:b[4],rating:b[5],createdAt:new Date().toISOString()})),
members:[[1,'سارا احمدی','1001','student','نهم'],[2,'علی محمدی','1002','student','هشتم'],[3,'مینا رضایی','1003','student','نهم'],[9,'خانم کریمی','admin','librarian','']].map(m=>({id:m[0],name:m[1],code:m[2],role:m[3],grade:m[4],active:true})),
loans:[{id:1,bookId:3,studentId:1,status:'pending',createdAt:new Date().toISOString()},{id:2,bookId:5,studentId:2,status:'pending',createdAt:new Date().toISOString()},{id:3,bookId:1,studentId:1,status:'active',createdAt:'2026-10-20T10:00:00Z',dueAt:'2026-11-03T10:00:00Z'}]};
try{const s=JSON.parse(localStorage.getItem('lib3'));if(s)DB=s}catch(e){}
function sv(){try{localStorage.setItem('lib3',JSON.stringify(DB))}catch(e){}}
const rd=f=>new Promise(r=>{const x=new FileReader();x.onload=()=>r(x.result);x.readAsDataURL(f)});
async function H(m,p,b){await new Promise(r=>setTimeout(r,120));
 const u=new URL(p,'http://x'),a=u.pathname.split('/').filter(Boolean),q=u.searchParams,k=a[0],id=+a[1],me=S.user,L=DB.loans,act=x=>L.filter(l=>l.bookId==x&&l.status=='active').length;
 const bv=x=>({...x,categoryName:(DB.cats.find(c=>c.id==x.categoryId)||{}).name,available:x.copies-act(x.id),loanCount:L.filter(l=>l.bookId==x.id).length});
 const lv=l=>({...l,bookTitle:(DB.books.find(x=>x.id==l.bookId)||{}).title,cover:(DB.books.find(x=>x.id==l.bookId)||{}).cover,studentName:(DB.members.find(x=>x.id==l.studentId)||{}).name});
 if(k=='auth'){const u=DB.members.find(x=>x.code==b.code&&x.role==b.role&&x.active);if(!u)throw Error('کد یا نقش نادرست است، یا حساب غیرفعال است');return{token:'demo',user:u}}
 if(k=='stats')return{books:DB.books.length,copies:DB.books.reduce((s,x)=>s+x.copies,0),active:L.filter(l=>l.status=='active').length,pending:L.filter(l=>l.status=='pending').length,overdue:L.filter(l=>l.status=='active'&&new Date(l.dueAt)<new Date()).length,members:DB.members.filter(x=>x.role=='student').length};
 if(k=='categories'){if(m=='GET')return DB.cats;if(m=='POST'){DB.cats.push({id:Date.now(),name:b.name,icon:b.icon||'📕'});return{ok:1}}
  if(DB.books.some(x=>x.categoryId==id))throw Error('این دسته کتاب دارد و قابل حذف نیست');DB.cats=DB.cats.filter(c=>c.id!=id);return{ok:1}}
 if(k=='members'){if(m=='GET')return DB.members;if(m=='POST'){if(DB.members.some(x=>x.code==b.code))throw Error('این کد عضویت قبلاً ثبت شده');DB.members.push({id:Date.now(),active:true,...b});return{ok:1}}DB.members.find(x=>x.id==id).active=b.active;return{ok:1}}
 if(k=='books'){if(m=='GET'){const t=q.get('q'),c=q.get('category');return DB.books.filter(x=>(!c||x.categoryId==c)&&(!t||(x.title+x.author).includes(t))).map(bv)}
  if(m=='DELETE'){if(act(id))throw Error('این کتاب امانت فعال دارد');DB.books=DB.books.filter(x=>x.id!=id);return{ok:1}}
  const f=Object.fromEntries(b),o={title:f.title,author:f.author,categoryId:+f.categoryId,copies:+f.copies};if(f.cover&&f.cover.size)o.cover=await rd(f.cover);
  if(m=='POST')DB.books.unshift({id:Date.now(),rating:0,createdAt:new Date().toISOString(),...o});else{const x=DB.books.find(x=>x.id==id);if(o.copies<act(id))throw Error('تعداد نسخه کمتر از امانت‌های فعال است');Object.assign(x,o)}return{ok:1}}
 if(k=='loans'){if(m=='GET'){let l=L.slice().reverse();if(q.get('mine'))l=l.filter(x=>x.studentId==me.id);if(q.get('status'))l=l.filter(x=>q.get('status').split(',').includes(x.status));return l.map(lv)}
  if(m=='POST'){const x=bv(DB.books.find(x=>x.id==b.bookId)),mine=L.filter(l=>l.studentId==me.id&&['pending','active'].includes(l.status));
   if(mine.length>=3)throw Error('حداکثر ۳ کتاب هم‌زمان قابل درخواست است');if(mine.some(l=>l.bookId==x.id))throw Error('این کتاب را قبلاً درخواست کرده‌ای');if(x.available<1)throw Error('این کتاب فعلاً موجود نیست');
   L.push({id:Date.now(),bookId:x.id,studentId:me.id,status:'pending',createdAt:new Date().toISOString()});return{ok:1}}
  const l=L.find(x=>x.id==id),A=b.action;if(A=='approve'){if(bv(DB.books.find(x=>x.id==l.bookId)).available<1)throw Error('نسخه‌ی آزاد وجود ندارد');l.status='active';l.dueAt=new Date(Date.now()+14*864e5).toISOString()}
  else if(A=='reject'){l.status='rejected';l.reason=b.reason}else if(A=='return'){l.status='returned';l.returnedAt=new Date().toISOString()}else l.status='cancelled';return{ok:1}}}
