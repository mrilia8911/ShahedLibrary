/*API CONTRACT (برای تیم بک‌اند)
 همه‌ی درخواست‌ها JSON هستند و هدر Authorization: Bearer <token> دارند، به جز ثبت/ویرایش کتاب که multipart/form-data است.
 POST   /auth/login        {code,password,role}                       -> {token,user:{id,name,code,role,grade}}
 GET    /categories                                                   -> [{id,name,icon}]
 POST   /categories        {name,icon}   | DELETE /categories/:id
 GET    /books?q=&category=                                           -> [{id,title,author,categoryId,categoryName,copies,available,rating,loanCount,cover(url),createdAt}]
 POST   /books  (multipart: title,author,categoryId,copies,cover[file])   PUT /books/:id (همان فیلدها)   DELETE /books/:id
 GET    /loans?mine=1&status=pending,active                           -> [{id,bookId,bookTitle,cover,studentId,studentName,status,createdAt,dueAt,returnedAt,reason}]
 POST   /loans             {bookId}                      (دانش‌آموز)
 PATCH  /loans/:id         {action:approve|reject|return|cancel, reason?}
 GET    /members | POST /members {name,code,grade,role} | PATCH /members/:id {active}
 GET    /stats                                                       -> {books,copies,active,pending,overdue,members}
 status: pending|active|rejected|returned|cancelled — خطاها: HTTP 4xx با {message:"متن فارسی"}
 برای اتصال به بک‌اند: API.mock=false و API.base را تنظیم کنید. */
const API={base:'/api',mock:true,token:null};
async function api(m,p,b){if(API.mock){const r=await H(m,p,b);if(m!='GET')sv();return r}
 const o={method:m,headers:{Authorization:'Bearer '+API.token}};if(b instanceof FormData)o.body=b;else if(b){o.headers['Content-Type']='application/json';o.body=JSON.stringify(b)}
 const r=await fetch(API.base+p,o),j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.message||'خطا در ارتباط با سرور');return j}
