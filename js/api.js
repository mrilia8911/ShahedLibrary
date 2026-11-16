/*
 * قرارداد API برای شمشیربند بیچاره
 *
 * همه‌ی درخواست‌ها JSON هستند و هدر Authorization: Bearer <token> دارند،
 * به جز ثبت/ویرایش کتاب که multipart/form-data است.
 *
 * POST   /auth/login  {code, password, role}
 *        → {token, user: {id, name, code, role, grade}}
 *
 * GET    /categories              → [{id, name, icon}]
 * POST   /categories  {name, icon}
 * DELETE /categories/:id
 *
 * GET    /books?q=&category=
 *        → [{id, title, author, categoryId, categoryName, copies,
 *            available, rating, loanCount, cover(url), createdAt}]
 * POST   /books      (multipart: title, author, categoryId, copies, cover[file])
 * PUT    /books/:id  (همان فیلدها)
 * DELETE /books/:id
 *
 * GET    /loans?mine=1&status=pending,active
 *        → [{id, bookId, bookTitle, cover, studentId, studentName,
 *            status, createdAt, dueAt, returnedAt, reason}]
 * POST   /loans       {bookId}                              (دانش‌آموز)
 * PATCH  /loans/:id   {action: approve|reject|return|cancel, reason?}
 *
 * GET    /members
 * POST   /members     {name, code, grade, role}
 * PATCH  /members/:id {active}
 *
 * GET    /stats → {books, copies, active, pending, overdue, members}
 *
 * status ها: pending | active | rejected | returned | cancelled
 * خطاها: HTTP 4xx با {message: "متن فارسی"}
 *
 * برای اتصال به بک‌اند: API.mock = false و API.base را تنظیم کنید.
 */

const API = {
  base: '/api',
  mock: true,
  token: null,
};

async function api(method, path, body) {
  if (API.mock) {
    const res = await H(method, path, body);
    if (method !== 'GET') sv();
    return res;
  }

  const opts = {
    method,
    headers: { Authorization: 'Bearer ' + API.token },
  };

  if (body instanceof FormData) {
    opts.body = body;
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(API.base + path, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(json.message || 'خطا در ارتباط با سرور');
  return json;
}
