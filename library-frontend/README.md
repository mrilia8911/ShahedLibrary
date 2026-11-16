# فرانت‌اند کتابخانه مدرسه (راهنمای تحویل به بک‌اند)

## ساختار
- `index.html` : پوسته‌ی برنامه (SPA، مسیریابی با hash مثل `#catalog`)
- `css/style.css` : همه‌ی استایل‌ها، رنگ‌ها در متغیرهای `:root` (پالت آبی کم‌رنگ + حالت تیره)
- `js/api.js` : قرارداد API و تابع `api(method, path, body)`. تنها نقطه‌ی ارتباط با سرور
- `js/mock.js` : بک‌اند آزمایشی داخل مرورگر. **در نسخه‌ی نهایی حذف شود** (و تگ آن از index.html)
- `js/app.js` : رابط کاربری، صفحه‌ها، پنجره‌های تأیید، ورود/خروج

## اتصال به بک‌اند
1. در `js/api.js` مقدار `API.mock=false` و `API.base` را روی آدرس سرور بگذارید.
2. فایل `js/mock.js` و تگ `<script src="js/mock.js">` را حذف کنید.
3. در بک‌اند CORS و هدر `Authorization: Bearer <token>` را پشتیبانی کنید.

## صفحه‌ها
دانش‌آموز: `home`, `catalog`, `myloans`, `profile`
کتابدار: `dash`, `requests`, `addbook`, `inventory`, `members`, `cats`
(صفحه‌ی ورود وقتی کاربر نباشد نمایش داده می‌شود.)

## قرارداد API
همه JSON هستند، به جز ثبت/ویرایش کتاب که `multipart/form-data` است.

| روش | آدرس | بدنه | پاسخ |
|---|---|---|---|
| POST | /auth/login | {code,password,role} | {token,user:{id,name,code,role,grade}} |
| GET | /categories | | [{id,name,icon}] |
| POST | /categories | {name,icon} | |
| DELETE | /categories/:id | | (اگر کتاب دارد خطا) |
| GET | /books?q=&category= | | [{id,title,author,categoryId,categoryName,copies,available,rating,loanCount,cover(url),createdAt}] |
| POST | /books | multipart: title,author,categoryId,copies,cover(file) | |
| PUT | /books/:id | همان فیلدها (cover اختیاری) | |
| DELETE | /books/:id | | (اگر امانت فعال دارد خطا) |
| GET | /loans?mine=1&status=pending,active | | [{id,bookId,bookTitle,cover,studentId,studentName,status,createdAt,dueAt,returnedAt,reason}] |
| POST | /loans | {bookId} | کاربر از توکن شناخته می‌شود |
| PATCH | /loans/:id | {action: approve/reject/return/cancel, reason?} | |
| GET | /members | | [{id,name,code,role,grade,active}] |
| POST | /members | {name,code,grade,role} | |
| PATCH | /members/:id | {active} | |
| GET | /stats | | {books,copies,active,pending,overdue,members} |

وضعیت امانت: `pending | active | rejected | returned | cancelled`
خطاها: کد HTTP 4xx و بدنه‌ی `{"message":"متن فارسی"}`؛ این متن مستقیم به کاربر نمایش داده می‌شود.

## قوانین کسب‌وکار که بک‌اند هم باید اعمال کند
(فرانت فقط پیام نشان می‌دهد، منبع حقیقت سرور است)
- حداکثر ۳ امانت (pending+active) برای هر دانش‌آموز
- درخواست تکراری برای یک کتاب ممنوع، و درخواست برای کتاب بدون نسخه‌ی آزاد ممنوع
- `available = copies − امانت‌های active`
- تأیید: status=active و `dueAt` = ۱۴ روز بعد (قابل تغییر)؛ دیرکرد: active و dueAt گذشته
- دسترسی‌ها: مسیرهای کتابدار فقط برای نقش librarian؛ دانش‌آموز فقط امانت‌های خودش
- عکس جلد: فرانت قبل از ارسال آن را کوچک می‌کند (حداکثر ۴۸۰ پیکسل، JPEG)؛ سرور باید نوع و حجم فایل را اعتبارسنجی کند

## اجرای محلی
`index.html` را با یک وب‌سرور ساده باز کنید (مثلاً `python3 -m http.server`).
ورود آزمایشی: دانش‌آموز `1001`، کتابدار `admin`.
