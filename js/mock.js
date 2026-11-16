/*
 * شبیه‌ساز بک‌اند — در نسخه‌ی نهایی حذف شود.
 */

let DB = {
  cats: [
    [1, 'داستانی', '📖'],
    [2, 'ماجراجویی', '⛰️'],
    [3, 'تاریخی', '🏰'],
    [4, 'علمی', '🧪'],
    [5, 'معمایی', '🔍'],
    [6, 'فانتزی', '🪄'],
  ].map((c) => ({ id: c[0], name: c[1], icon: c[2] })),

  books: [
    [1, 'شازده کوچولو', 'آنتوان دو سنت اگزوپری', 6, 4, 4.8],
    [2, 'هفت گناه', 'آگاتا کریستی', 5, 2, 4.5],
    [3, 'ملت عشق', 'الیف شافاک', 1, 3, 4.6],
    [4, 'جزیره‌ی گنج', 'رابرت لوئیس استیونسون', 2, 3, 4.3],
    [5, 'سفر به مرکز زمین', 'ژول ورن', 4, 2, 4.4],
    [6, 'کیمیاگر', 'پائولو کوئیلو', 1, 3, 4.5],
  ].map((b) => ({
    id: b[0],
    title: b[1],
    author: b[2],
    categoryId: b[3],
    copies: b[4],
    rating: b[5],
    createdAt: new Date().toISOString(),
  })),

  members: [
    [1, 'سارا احمدی', '1001', 'student', 'نهم'],
    [2, 'علی محمدی', '1002', 'student', 'هشتم'],
    [3, 'مینا رضایی', '1003', 'student', 'نهم'],
    [9, 'خانم کریمی', 'admin', 'librarian', ''],
  ].map((m) => ({
    id: m[0],
    name: m[1],
    code: m[2],
    role: m[3],
    grade: m[4],
    active: true,
  })),

  loans: [
    {
      id: 1,
      bookId: 3,
      studentId: 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      bookId: 5,
      studentId: 2,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      bookId: 1,
      studentId: 1,
      status: 'active',
      createdAt: '2026-10-20T10:00:00Z',
      dueAt: '2026-11-03T10:00:00Z',
    },
  ],
};

try {
  const saved = JSON.parse(localStorage.getItem('lib3'));
  if (saved) DB = saved;
} catch {}

function sv() {
  try {
    localStorage.setItem('lib3', JSON.stringify(DB));
  } catch {}
}

const rd = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

async function H(method, path, body) {
  await new Promise((r) => setTimeout(r, 120));

  const url = new URL(path, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);
  const q = url.searchParams;
  const resource = parts[0];
  const id = +parts[1];
  const me = S.user;
  const loans = DB.loans;

  const activeCount = (bookId) =>
    loans.filter((l) => l.bookId == bookId && l.status === 'active').length;

  const viewBook = (b) => ({
    ...b,
    categoryName: (DB.cats.find((c) => c.id == b.categoryId) || {}).name,
    available: b.copies - activeCount(b.id),
    loanCount: loans.filter((l) => l.bookId == b.id).length,
  });

  const viewLoan = (l) => ({
    ...l,
    bookTitle: (DB.books.find((x) => x.id == l.bookId) || {}).title,
    cover: (DB.books.find((x) => x.id == l.bookId) || {}).cover,
    studentName: (DB.members.find((x) => x.id == l.studentId) || {}).name,
  });

  if (resource === 'auth') {
    const user = DB.members.find(
      (x) => x.code == body.code && x.role == body.role && x.active
    );
    if (!user) throw Error('کد یا نقش نادرست است، یا حساب غیرفعال است');
    return { token: 'demo', user };
  }

  if (resource === 'stats') {
    return {
      books: DB.books.length,
      copies: DB.books.reduce((s, x) => s + x.copies, 0),
      active: loans.filter((l) => l.status === 'active').length,
      pending: loans.filter((l) => l.status === 'pending').length,
      overdue: loans.filter(
        (l) => l.status === 'active' && new Date(l.dueAt) < new Date()
      ).length,
      members: DB.members.filter((x) => x.role === 'student').length,
    };
  }

  if (resource === 'categories') {
    if (method === 'GET') return DB.cats;

    if (method === 'POST') {
      DB.cats.push({ id: Date.now(), name: body.name, icon: body.icon || '📕' });
      return { ok: 1 };
    }

    if (DB.books.some((x) => x.categoryId == id)) {
      throw Error('این دسته کتاب دارد و قابل حذف نیست');
    }
    DB.cats = DB.cats.filter((c) => c.id != id);
    return { ok: 1 };
  }

  if (resource === 'members') {
    if (method === 'GET') return DB.members;

    if (method === 'POST') {
      if (DB.members.some((x) => x.code == body.code)) {
        throw Error('این کد عضویت قبلاً ثبت شده');
      }
      DB.members.push({ id: Date.now(), active: true, ...body });
      return { ok: 1 };
    }

    DB.members.find((x) => x.id == id).active = body.active;
    return { ok: 1 };
  }

  if (resource === 'books') {
    if (method === 'GET') {
      const term = q.get('q');
      const cat = q.get('category');
      return DB.books
        .filter(
          (x) =>
            (!cat || x.categoryId == cat) &&
            (!term || (x.title + x.author).includes(term))
        )
        .map(viewBook);
    }

    if (method === 'DELETE') {
      if (activeCount(id)) throw Error('این کتاب امانت فعال دارد');
      DB.books = DB.books.filter((x) => x.id != id);
      return { ok: 1 };
    }

    const fields = Object.fromEntries(body);
    const data = {
      title: fields.title,
      author: fields.author,
      categoryId: +fields.categoryId,
      copies: +fields.copies,
    };

    if (fields.cover && fields.cover.size) data.cover = await rd(fields.cover);

    if (method === 'POST') {
      DB.books.unshift({
        id: Date.now(),
        rating: 0,
        createdAt: new Date().toISOString(),
        ...data,
      });
    } else {
      const book = DB.books.find((x) => x.id == id);
      if (data.copies < activeCount(id)) {
        throw Error('تعداد نسخه کمتر از امانت‌های فعال است');
      }
      Object.assign(book, data);
    }
    return { ok: 1 };
  }

  if (resource === 'loans') {
    if (method === 'GET') {
      let list = loans.slice().reverse();
      if (q.get('mine')) list = list.filter((x) => x.studentId == me.id);
      if (q.get('status')) {
        list = list.filter((x) => q.get('status').split(',').includes(x.status));
      }
      return list.map(viewLoan);
    }

    if (method === 'POST') {
      const book = viewBook(DB.books.find((x) => x.id == body.bookId));
      const mine = loans.filter(
        (l) => l.studentId == me.id && ['pending', 'active'].includes(l.status)
      );

      if (mine.length >= 3) throw Error('حداکثر ۳ کتاب هم‌زمان قابل درخواست است');
      if (mine.some((l) => l.bookId == book.id)) {
        throw Error('این کتاب را قبلاً درخواست کرده‌ای');
      }
      if (book.available < 1) throw Error('این کتاب فعلاً موجود نیست');

      loans.push({
        id: Date.now(),
        bookId: book.id,
        studentId: me.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      return { ok: 1 };
    }

    const loan = loans.find((x) => x.id == id);
    const action = body.action;

    if (action === 'approve') {
      const book = viewBook(DB.books.find((x) => x.id == loan.bookId));
      if (book.available < 1) throw Error('نسخه‌ی آزاد وجود ندارد');
      loan.status = 'active';
      loan.dueAt = new Date(Date.now() + 14 * 864e5).toISOString();
    } else if (action === 'reject') {
      loan.status = 'rejected';
      loan.reason = body.reason;
    } else if (action === 'return') {
      loan.status = 'returned';
      loan.returnedAt = new Date().toISOString();
    } else {
      loan.status = 'cancelled';
    }

    return { ok: 1 };
  }
}
