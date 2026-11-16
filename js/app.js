const $ = (sel) => document.querySelector(sel);
const fa = (n) => Number(n).toLocaleString('fa-IR');
const dt = (d) => (d ? new Date(d).toLocaleDateString('fa-IR') : '—');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])
  );

const S = {
  user: null,
  q: '',
  cat: '',
  cover: null,
  edit: null,
  role: 'student',
};

try {
  const saved = JSON.parse(sessionStorage.getItem('u'));
  if (saved) {
    S.user = saved.u;
    API.token = saved.t;
  }
} catch {}

const ST = {
  pending: ['در انتظار تأیید', 'wa'],
  active: ['امانت فعال', 'in'],
  rejected: ['رد شده', 'no'],
  returned: ['بازگردانده شد', ''],
  cancelled: ['لغو شده', 'no'],
};

const NAV = {
  student: [
    ['home', '🏠', 'خانه'],
    ['catalog', '🔎', 'جستجوی کتاب'],
    ['myloans', '📘', 'امانت‌های من'],
    ['profile', '👤', 'پروفایل'],
  ],
  librarian: [
    ['dash', '📊', 'داشبورد'],
    ['requests', '📥', 'درخواست‌ها و امانت‌ها'],
    ['addbook', '➕', 'ثبت کتاب'],
    ['inventory', '📚', 'موجودی کتاب‌ها'],
    ['members', '🎓', 'دانش‌آموزان'],
    ['cats', '🗂️', 'دسته‌بندی‌ها'],
  ],
};

const TT = {};
Object.values(NAV)
  .flat()
  .forEach((n) => (TT[n[0]] = n[2]));

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'on';
  clearTimeout(toast.h);
  toast.h = setTimeout(() => (el.className = ''), 2600);
}

async function run(fn, successMsg) {
  try {
    await fn();
    if (successMsg) toast(successMsg);
    render();
  } catch (err) {
    toast(err.message);
  }
}

function showM(html) {
  $('#md').innerHTML =
    '<div class="mc" role="dialog" aria-modal="true">' + html + '</div>';
  $('#md').className = 'md on';
}

function closeM() {
  $('#md').className = 'md';
  if (S.rs) {
    S.rs(null);
    S.rs = null;
  }
}

$('#md').onclick = (e) => {
  if (e.target.id === 'md') closeM();
};

function ask(title, message, withInput, okLabel) {
  return new Promise((resolve) => {
    S.rs = resolve;
    showM(`
      <h3>${title}</h3>
      <p>${message}</p>
      ${withInput ? '<textarea id="mi" rows="3" placeholder="دلیل (اختیاری)"></textarea>' : ''}
      <div class="ac">
        <button class="btn s" onclick="closeM()">انصراف</button>
        <button class="btn" onclick="yes()">${okLabel || 'تأیید'}</button>
      </div>
    `);
  });
}

function yes() {
  const input = $('#mi');
  const resolve = S.rs;
  S.rs = null;
  $('#md').className = 'md';
  resolve(input ? input.value || true : true);
}

const cvr = (book, withTag) => `
  <div class="cv">
    ${
      book.cover
        ? `<img src="${esc(book.cover)}" alt="جلد ${esc(book.title)}" loading="lazy">`
        : esc(book.title[0])
    }
    ${withTag ? `<span class="tag">${esc(book.categoryName || '')}</span>` : ''}
  </div>
`;

const th = (book) =>
  book.cover
    ? `<img class="th" src="${esc(book.cover)}" alt="">`
    : `<span class="th">📕</span>`;

const avb = (book) =>
  `<span class="bd ${book.available ? '' : 'no'}">${
    book.available ? 'موجود (' + fa(book.available) + ')' : 'ناموجود'
  }</span>`;

const card = (book) => `
  <div class="bk">
    ${cvr(book, 1)}
    <b>${esc(book.title)}</b>
    <small>${esc(book.author)}</small>
    <small>⭐ ${fa(book.rating)}</small>
    <div>${avb(book)}</div>
    <button class="btn s" onclick="openBook(${book.id})">مشاهده کتاب</button>
  </div>
`;

const route = () =>
  location.hash.slice(1) || (S.user.role === 'student' ? 'home' : 'dash');

function login() {
  S.user = null;
  $('#side').hidden = true;
  $('#app').innerHTML = `
    <div class="login">
      <h2>📖 کتابخانه مدرسه</h2>
      <small style="color:var(--mu)">برای ادامه وارد شوید</small>

      <div class="seg">
        <button class="${S.role === 'student' ? 'on' : ''}"
                onclick="S.role='student';login()">دانش‌آموز</button>
        <button class="${S.role === 'librarian' ? 'on' : ''}"
                onclick="S.role='librarian';login()">کتابدار</button>
      </div>

      <form class="f" onsubmit="doLogin(event)">
        <label>کد ${S.role === 'student' ? 'دانش‌آموزی' : 'کتابدار'}
          <input name="code" required autocomplete="username">
        </label>
        <label>رمز عبور
          <input name="password" type="password" autocomplete="current-password">
        </label>
        <div class="err" id="le"></div>
        <button class="btn">ورود</button>
      </form>

      ${
        API.mock
          ? '<p style="font-size:12px;color:var(--mu)">نسخه‌ی آزمایشی: دانش‌آموز ۱۰۰۱ ، کتابدار admin (رمز دلخواه)</p>'
          : ''
      }
    </div>
  `;
}

async function doLogin(e) {
  e.preventDefault();
  const form = e.target;
  try {
    const res = await api('POST', '/auth/login', {
      code: form.code.value,
      password: form.password.value,
      role: S.role,
    });
    S.user = res.user;
    API.token = res.token;
    try {
      sessionStorage.setItem('u', JSON.stringify({ u: res.user, t: res.token }));
    } catch {}
    location.hash = '';
    render();
  } catch (err) {
    $('#le').textContent = err.message;
  }
}

function logout() {
  try {
    sessionStorage.clear();
  } catch {}
  S.user = null;
  location.hash = '';
  login();
}

async function render() {
  if (!S.user) return login();

  let current = route();
  if (!NAV[S.user.role].some((n) => n[0] === current)) {
    current = NAV[S.user.role][0][0];
  }

  const side = $('#side');
  side.hidden = false;
  side.innerHTML =
    '<div class="logo"><i>📖</i>کتابخانه مدرسه</div>' +
    NAV[S.user.role]
      .map(
        (n) =>
          `<a href="#${n[0]}" class="${current === n[0] ? 'on' : ''}"><span>${n[1]}</span>${n[2]}</a>`
      )
      .join('') +
    '<div class="sp"></div><button class="lo" onclick="logout()">↩ خروج از حساب</button>';

  $('#app').innerHTML = `
    <div class="top">
      <h1>${TT[current]}</h1>
      <div class="who">
        <span class="av">${esc(S.user.name[0])}</span>${esc(S.user.name)}
      </div>
    </div>
    <div id="pg"><div class="empty">در حال بارگذاری…</div></div>
  `;

  try {
    $('#pg').innerHTML = await P[current]();
    if (AF[current]) AF[current]();
  } catch (err) {
    $('#pg').innerHTML = `
      <div class="empty">
        ${esc(err.message)}<br><br>
        <button class="btn s" onclick="render()">تلاش دوباره</button>
      </div>
    `;
  }
}

const loanRows = (loans, mode) => {
  if (!loans.length) return '<div class="empty">موردی وجود ندارد.</div>';

  return `
    <div class="tw">
      <table>
        <tr>
          <th>کتاب
          <th>${mode === 'me' ? 'تاریخ درخواست' : 'دانش‌آموز'}
          <th>${mode === 'act' ? 'مهلت بازگشت' : 'تاریخ'}
          <th>${mode === 'me' ? 'وضعیت' : ''}
        </tr>
        ${loans
          .map((x) => {
            const status = ST[x.status];
            const overdue =
              x.status === 'active' && new Date(x.dueAt) < new Date();

            return `
              <tr>
                <td>${th(x)}${esc(x.bookTitle)}
                <td>${mode === 'me' ? dt(x.createdAt) : esc(x.studentName)}
                <td>${
                  mode === 'act'
                    ? dt(x.dueAt) +
                      (overdue ? ' <span class="bd no">دیرکرد</span>' : '')
                    : dt(x.createdAt)
                }
                <td>${
                  mode === 'me'
                    ? `<span class="bd ${status[1]}">${status[0]}</span>
                       ${x.reason ? '<br><small>' + esc(x.reason) + '</small>' : ''}
                       ${
                         x.status === 'pending'
                           ? ` <button class="btn r" onclick="la(${x.id},'cancel')">لغو</button>`
                           : ''
                       }`
                    : x.status === 'pending'
                    ? `<button class="btn g" onclick="la(${x.id},'approve')">تأیید</button>
                       <button class="btn r" onclick="la(${x.id},'reject')">رد</button>`
                    : `<button class="btn s" onclick="la(${x.id},'return')">ثبت بازگشت</button>`
                }
              </tr>
            `;
          })
          .join('')}
      </table>
    </div>
  `;
};

async function la(id, action) {
  const config = {
    approve: ['تأیید درخواست', 'امانت فعال می‌شود و مهلت بازگشت ۱۴ روز است.'],
    reject: ['رد درخواست', 'دلیل رد برای دانش‌آموز نمایش داده می‌شود.'],
    return: ['ثبت بازگشت', 'بازگشت کتاب ثبت و یک نسخه آزاد می‌شود.'],
    cancel: ['لغو درخواست', 'درخواست شما لغو می‌شود.'],
  }[action];

  const v = await ask(config[0], config[1], action === 'reject');
  if (!v) return;

  run(
    () =>
      api('PATCH', '/loans/' + id, {
        action,
        reason: typeof v === 'string' ? v : '',
      }),
    'انجام شد'
  );
}

async function openBook(id) {
  const book = (await api('GET', '/books')).find((x) => x.id == id);
  const isStudent = S.user.role === 'student';

  showM(`
    <div style="display:flex;gap:14px">
      <div style="width:120px;flex-shrink:0">${cvr(book)}</div>
      <div>
        <h3>${esc(book.title)}</h3>
        <p style="margin:0 0 8px">
          ${esc(book.author)}<br>
          دسته: ${esc(book.categoryName)}<br>
          ⭐ ${fa(book.rating)} · ${fa(book.copies)} نسخه
        </p>
        ${avb(book)}
      </div>
    </div>
    <div class="ac" style="margin-top:16px">
      <button class="btn s" onclick="closeM()">بستن</button>
      ${
        isStudent
          ? `<button class="btn" ${book.available ? '' : 'disabled'} onclick="req(${book.id})">درخواست امانت</button>`
          : ''
      }
    </div>
  `);
}

async function req(id) {
  closeM();
  const ok = await ask(
    'ثبت درخواست امانت',
    'درخواست برای کتابدار ارسال می‌شود و پس از تأیید می‌توانی کتاب را تحویل بگیری.'
  );
  if (!ok) return;
  run(() => api('POST', '/loans', { bookId: id }), 'درخواست ثبت شد');
}

const P = {
  async home() {
    const [books, categories, myLoans] = await Promise.all([
      api('GET', '/books'),
      api('GET', '/categories'),
      api('GET', '/loans?mine=1&status=pending,active'),
    ]);

    const listItem = (b) => `
      <div class="li" onclick="openBook(${b.id})" style="cursor:pointer">
        ${th(b)}
        <div style="flex:1">
          <b>${esc(b.title)}</b><br>
          <small style="color:var(--mu)">${esc(b.author)}</small>
        </div>
        ${avb(b)}
      </div>
    `;

    return `
      <div class="hero">
        <div>
          <h2>به کتابخانه مدرسه خوش آمدی!</h2>
          <p>هر کتاب، شروع یک ماجراجویی تازه است.</p>
          <form class="sb" onsubmit="S.q=this.q.value;S.cat='';location.hash='catalog';return false">
            <input name="q" placeholder="نام کتاب یا نویسنده را وارد کنید…" aria-label="جستجو">
            <button class="btn">جستجو</button>
          </form>
        </div>
        <div class="big">📚</div>
      </div>

      <section class="sec">
        <h3>دسته‌بندی کتاب‌ها<a href="#catalog">مشاهده همه</a></h3>
        <div class="cats">
          ${
            categories
              .map(
                (c) => `
                  <div class="cat" role="button" tabindex="0"
                       onclick="S.cat=${c.id};S.q='';location.hash='catalog'">
                    <span>${c.icon}</span>
                    ${esc(c.name)}<br>
                    <small>${fa(books.filter((b) => b.categoryId == c.id).length)} کتاب</small>
                  </div>
                `
              )
              .join('') || '<div class="empty">دسته‌ای ثبت نشده است.</div>'
          }
        </div>
      </section>

      <section class="sec">
        <h3>کتاب‌های پیشنهادی<a href="#catalog">مشاهده همه</a></h3>
        <div class="grid">
          ${
            books
              .filter((b) => b.available)
              .sort((a, b) => b.rating - a.rating)
              .slice(0, 4)
              .map(card)
              .join('') || '<div class="empty">کتابی ثبت نشده است.</div>'
          }
        </div>
      </section>

      <div class="three">
        <section class="sec">
          <h3>تازه‌های کتابخانه</h3>
          ${
            books
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 4)
              .map(listItem)
              .join('')
          }
        </section>

        <section class="sec">
          <h3>محبوب‌ترین‌ها</h3>
          ${
            books
              .slice()
              .sort((a, b) => b.loanCount - a.loanCount)
              .slice(0, 4)
              .map(listItem)
              .join('')
          }
        </section>

        <section class="sec">
          <h3>امانت‌های من<a href="#myloans">همه</a></h3>
          ${
            myLoans.length
              ? myLoans
                  .slice(0, 4)
                  .map(
                    (x) => `
                      <div class="li">
                        ${th(x)}
                        <div style="flex:1"><b>${esc(x.bookTitle)}</b></div>
                        <span class="bd ${ST[x.status][1]}">${ST[x.status][0]}</span>
                      </div>
                    `
                  )
                  .join('')
              : '<div class="empty">درخواست فعالی نداری.</div>'
          }
        </section>
      </div>
    `;
  },

  async catalog() {
    const categories = await api('GET', '/categories');
    return `
      <div class="row">
        <input id="q" value="${esc(S.q)}" placeholder="جستجوی نام کتاب یا نویسنده"
               oninput="S.q=this.value;clearTimeout(S.t);S.t=setTimeout(lst,250)"
               aria-label="جستجو">
        <select onchange="S.cat=this.value;lst()" aria-label="دسته">
          <option value="">همه دسته‌ها</option>
          ${categories
            .map(
              (c) =>
                `<option value="${c.id}" ${S.cat == c.id ? 'selected' : ''}>${esc(c.name)}</option>`
            )
            .join('')}
        </select>
      </div>
      <div id="list"></div>
    `;
  },

  async myloans() {
    return `
      <section class="sec">
        <h3>امانت‌ها و درخواست‌های من</h3>
        ${loanRows(await api('GET', '/loans?mine=1'), 'me')}
      </section>
    `;
  },

  async profile() {
    const loans = await api('GET', '/loans?mine=1');
    const u = S.user;

    return `
      <div class="stats">
        <div class="st"><b>${fa(loans.length)}</b><span>کل درخواست‌ها</span></div>
        <div class="st"><b>${fa(loans.filter((x) => x.status === 'active').length)}</b><span>امانت فعال</span></div>
        <div class="st"><b>${fa(loans.filter((x) => x.status === 'returned').length)}</b><span>کتاب خوانده‌شده</span></div>
      </div>

      <section class="sec">
        <h3>اطلاعات من</h3>
        <p>
          نام: ${esc(u.name)}<br>
          کد دانش‌آموزی: ${esc(u.code)}<br>
          پایه: ${esc(u.grade || '—')}
        </p>
      </section>
    `;
  },

  async dash() {
    const [stats, pending, active] = await Promise.all([
      api('GET', '/stats'),
      api('GET', '/loans?status=pending'),
      api('GET', '/loans?status=active'),
    ]);

    const statItems = [
      [stats.books, 'عنوان کتاب'],
      [stats.copies, 'کل نسخه‌ها'],
      [stats.active, 'امانت فعال'],
      [stats.pending, 'درخواست جدید'],
      [stats.overdue, 'دیرکرد'],
      [stats.members, 'دانش‌آموز'],
    ];

    return `
      <div class="stats">
        ${statItems
          .map(
            ([value, label]) =>
              `<div class="st"><b>${fa(value)}</b><span>${label}</span></div>`
          )
          .join('')}
      </div>

      <section class="sec">
        <h3>درخواست‌های منتظر تأیید<a href="#requests">مشاهده همه</a></h3>
        ${loanRows(pending.slice(0, 5), 'staff')}
      </section>

      <section class="sec">
        <h3>دیرکردها</h3>
        ${loanRows(active.filter((x) => new Date(x.dueAt) < new Date()), 'act')}
      </section>
    `;
  },

  async requests() {
    const [pending, active] = await Promise.all([
      api('GET', '/loans?status=pending'),
      api('GET', '/loans?status=active'),
    ]);

    return `
      <section class="sec">
        <h3>درخواست‌های منتظر تأیید</h3>
        ${loanRows(pending, 'staff')}
      </section>
      <section class="sec">
        <h3>امانت‌های فعال</h3>
        ${loanRows(active, 'act')}
      </section>
    `;
  },

  async addbook() {
    const categories = await api('GET', '/categories');
    const editing = S.edit
      ? (await api('GET', '/books')).find((x) => x.id == S.edit)
      : null;
    S.cover = null;

    return `
      <div class="two">
        <section class="sec">
          <h3>${editing ? 'ویرایش کتاب' : 'ثبت کتاب جدید'}</h3>
          <form class="f" id="nf" onsubmit="saveBook(event)">
            <label class="full">عنوان کتاب
              <input name="title" required value="${esc(editing && editing.title)}">
            </label>
            <label>نویسنده
              <input name="author" required value="${esc(editing && editing.author)}">
            </label>
            <label>دسته‌بندی
              <select name="categoryId" required>
                ${categories
                  .map(
                    (c) =>
                      `<option value="${c.id}" ${editing && editing.categoryId == c.id ? 'selected' : ''}>${esc(c.name)}</option>`
                  )
                  .join('')}
              </select>
            </label>
            <label>تعداد نسخه
              <input name="copies" type="number" min="1" required
                     value="${editing ? editing.copies : 1}">
            </label>
            <label>تصویر جلد
              <input type="file" accept="image/*" onchange="pick(this)">
            </label>
            <div class="full">
              <button class="btn">${editing ? 'ذخیره تغییرات' : 'ثبت کتاب'}</button>
              ${
                editing
                  ? '<button type="button" class="btn s" onclick="S.edit=null;render()">انصراف</button>'
                  : ''
              }
            </div>
          </form>
        </section>

        <section class="sec">
          <h3>جلد کتاب</h3>
          <div id="cvp" style="max-width:200px">${cvr(editing || { title: '؟' })}</div>
        </section>
      </div>
    `;
  },

  async inventory() {
    const books = await api('GET', '/books');
    return `
      <section class="sec">
        <h3>موجودی کتاب‌ها (${fa(books.length)})</h3>
        ${
          books.length
            ? `<div class="tw">
                 <table>
                   <tr><th>کتاب<th>دسته<th>موجود / کل<th></tr>
                   ${books
                     .map(
                       (x) => `
                         <tr>
                           <td>${th(x)}${esc(x.title)}<br>
                               <small style="color:var(--mu)">${esc(x.author)}</small>
                           <td>${esc(x.categoryName)}
                           <td>${fa(x.available)} / ${fa(x.copies)}
                           <td>
                             <button class="btn s" onclick="S.edit=${x.id};location.hash='addbook'">ویرایش</button>
                             <button class="btn r" onclick="delBook(${x.id})">حذف</button>
                         </tr>
                       `
                     )
                     .join('')}
                 </table>
               </div>`
            : '<div class="empty">هنوز کتابی ثبت نشده است.</div>'
        }
      </section>
    `;
  },

  async members() {
    const members = (await api('GET', '/members')).filter(
      (x) => x.role === 'student'
    );

    return `
      <div class="two">
        <section class="sec">
          <h3>دانش‌آموزان (${fa(members.length)})</h3>
          <div class="tw">
            <table>
              <tr><th>نام<th>کد<th>پایه<th></tr>
              ${members
                .map(
                  (x) => `
                    <tr>
                      <td>${esc(x.name)}
                      <td>${esc(x.code)}
                      <td>${esc(x.grade)}
                      <td><button class="btn ${x.active ? 'r' : 'g'}"
                                  onclick="tg(${x.id},${!x.active})">${x.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button>
                    </tr>
                  `
                )
                .join('')}
            </table>
          </div>
        </section>

        <section class="sec">
          <h3>عضو جدید</h3>
          <form class="f" onsubmit="addM(event)">
            <label class="full">نام و نام خانوادگی<input name="name" required></label>
            <label>کد دانش‌آموزی<input name="code" required></label>
            <label>پایه<input name="grade"></label>
            <div class="full"><button class="btn">افزودن</button></div>
          </form>
        </section>
      </div>
    `;
  },

  async cats() {
    const [categories, books] = await Promise.all([
      api('GET', '/categories'),
      api('GET', '/books'),
    ]);

    return `
      <div class="two">
        <section class="sec">
          <h3>دسته‌بندی‌ها</h3>
          <div class="tw">
            <table>
              <tr><th>دسته<th>تعداد کتاب<th></tr>
              ${categories
                .map(
                  (x) => `
                    <tr>
                      <td>${x.icon} ${esc(x.name)}
                      <td>${fa(books.filter((y) => y.categoryId == x.id).length)}
                      <td><button class="btn r" onclick="delCat(${x.id})">حذف</button>
                    </tr>
                  `
                )
                .join('')}
            </table>
          </div>
        </section>

        <section class="sec">
          <h3>دسته‌ی جدید</h3>
          <form class="f" onsubmit="addC(event)">
            <label>نام<input name="name" required></label>
            <label>نماد (ایموجی)<input name="icon" maxlength="2" value="📕"></label>
            <div class="full"><button class="btn">افزودن</button></div>
          </form>
        </section>
      </div>
    `;
  },
};

const AF = {
  catalog() {
    lst();
  },
};

async function lst() {
  const params = new URLSearchParams();
  if (S.q) params.set('q', S.q);
  if (S.cat) params.set('category', S.cat);

  try {
    const books = await api('GET', '/books?' + params);
    $('#list').innerHTML = books.length
      ? `<div class="grid">${books.map(card).join('')}</div>`
      : '<div class="empty">کتابی پیدا نشد. عبارت دیگری را امتحان کن.</div>';
  } catch (err) {
    toast(err.message);
  }
}

function pick(input) {
  const file = input.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    const ratio = Math.min(1, 480 / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = img.width * ratio;
    canvas.height = img.height * ratio;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => (S.cover = blob), 'image/jpeg', 0.82);
    $('#cvp').innerHTML = `<div class="cv"><img src="${canvas.toDataURL('image/jpeg', 0.82)}" alt="پیش‌نمایش جلد"></div>`;
  };
  img.src = URL.createObjectURL(file);
}

async function saveBook(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  if (S.cover) formData.append('cover', S.cover, 'cover.jpg');

  const editing = S.edit;
  const ok = await ask(
    editing ? 'ذخیره تغییرات' : 'ثبت کتاب',
    'اطلاعات کتاب ' + (editing ? 'به‌روزرسانی' : 'ثبت') + ' شود؟'
  );
  if (!ok) return;

  run(async () => {
    await api(editing ? 'PUT' : 'POST', editing ? '/books/' + editing : '/books', formData);
    S.edit = null;
    location.hash = 'inventory';
  }, 'کتاب ذخیره شد');
}

async function delBook(id) {
  const ok = await ask('حذف کتاب', 'این کتاب برای همیشه حذف می‌شود.', 0, 'حذف');
  if (ok) run(() => api('DELETE', '/books/' + id), 'کتاب حذف شد');
}

async function delCat(id) {
  const ok = await ask('حذف دسته', 'دسته‌ی انتخاب‌شده حذف می‌شود.', 0, 'حذف');
  if (ok) run(() => api('DELETE', '/categories/' + id), 'دسته حذف شد');
}

function addC(e) {
  e.preventDefault();
  const f = e.target;
  run(
    () => api('POST', '/categories', { name: f.name.value, icon: f.icon.value }),
    'دسته اضافه شد'
  );
}

function addM(e) {
  e.preventDefault();
  const f = e.target;
  run(
    () =>
      api('POST', '/members', {
        name: f.name.value,
        code: f.code.value,
        grade: f.grade.value,
        role: 'student',
      }),
    'عضو اضافه شد'
  );
}

async function tg(id, active) {
  const ok = await ask(
    active ? 'فعال‌سازی حساب' : 'غیرفعال‌سازی حساب',
    active
      ? 'دانش‌آموز می‌تواند دوباره وارد شود.'
      : 'دانش‌آموز دیگر نمی‌تواند وارد شود یا درخواست ثبت کند.'
  );
  if (ok) run(() => api('PATCH', '/members/' + id, { active }), 'انجام شد');
}

addEventListener('hashchange', render);
render();
