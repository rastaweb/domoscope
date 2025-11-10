/**
 * Comprehensive content for demonstrating all domoscope features
 * Includes various types of changes: text modifications, attribute changes,
 * added/removed elements, nested changes, and edge cases
 */

// ORIGINAL CONTENT - Before changes
export const oldContent = `
<article class="blog-post draft" data-id="123">
  <header class="post-header">
    <h1>راهنمای جامع توسعه برنامه‌های وب مدرن</h1>
    <div class="meta">
      <span class="author">نویسنده: محمد احمدی</span>
      <span class="date">تاریخ انتشار: ۱۴۰۲/۰۸/۱۵</span>
      <span class="category">دسته: برنامه‌نویسی</span>
    </div>
  </header>

  <section class="introduction">
    <p>
      در دنیای امروز، <strong>توسعه وب</strong> یکی از مهم‌ترین و پرطرفدارترین 
      حوزه‌های فناوری اطلاعات است. این مقاله به بررسی تکنولوژی‌های مختلف 
      می‌پردازد.
    </p>
    <img src="/images/web-development.jpg" alt="توسعه وب" width="600" />
  </section>

  <section class="frameworks">
    <h2>فریمورک‌های محبوب</h2>
    <p>در حال حاضر چندین فریمورک <b>محبوب</b> برای توسعه وب وجود دارد:</p>
    <ul class="framework-list">
      <li><a href="/react" title="React Framework">React</a> - کتابخانه جاوااسکریپت</li>
      <li><a href="/vue" title="Vue Framework">Vue.js</a> - فریمورک پیشرونده</li>
      <li><a href="/angular">Angular</a> - فریمورک کامل</li>
    </ul>
  </section>

  <section class="best-practices">
    <h2>بهترین شیوه‌های کدنویسی</h2>
    <p>برای نوشتن کد تمیز و قابل نگهداری، باید موارد زیر را رعایت کنید:</p>
    <ol>
      <li>استفاده از نام‌گذاری مناسب برای متغیرها</li>
      <li>نوشتن کد قابل خواندن و مستند</li>
      <li>استفاده از الگوهای طراحی</li>
    </ol>
  </section>

  <section class="code-examples">
    <h2>نمونه کدها</h2>
    <p>در اینجا یک مثال ساده از کد جاوااسکریپت را مشاهده می‌کنید:</p>
    <pre><code>function getData() {
  return fetch('/api/users');
}</code></pre>
  </section>

  <section class="resources">
    <h2>منابع یادگیری</h2>
    <div class="resource-card">
      <h3>کتاب‌های توصیه شده</h3>
      <p>برای یادگیری بهتر، این کتاب‌ها را مطالعه کنید.</p>
    </div>
  </section>

  <footer class="post-footer">
    <p>برای اطلاعات بیشتر با ما تماس بگیرید.</p>
    <button type="button" disabled>ارسال نظر</button>
  </footer>
</article>
`;

// NEW CONTENT - After comprehensive changes
export const newContent = `
<article class="blog-post published featured" data-id="123" data-version="2">
  <header class="post-header updated">
    <h1>راهنمای جامع و کاربردی توسعه برنامه‌های وب مدرن و پیشرفته</h1>
    <div class="meta enhanced">
      <span class="author verified">نویسنده: دکتر محمد احمدی</span>
      <span class="date">تاریخ انتشار: ۱۴۰۲/۰۸/۱۵ | بروزرسانی: ۱۴۰۲/۱۱/۱۰</span>
      <span class="category">دسته: برنامه‌نویسی وب</span>
      <span class="reading-time">زمان مطالعه: ۱۵ دقیقه</span>
      <div class="tags">
        <span class="tag">React</span>
        <span class="tag">TypeScript</span>
        <span class="tag">آموزش</span>
      </div>
    </div>
  </header>

  <section class="introduction highlighted">
    <p>
      در دنیای امروز، <strong>توسعه وب مدرن</strong> یکی از مهم‌ترین و پرکاربردترین 
      حوزه‌های فناوری اطلاعات و ارتباطات است. این مقاله به بررسی جامع تکنولوژی‌های 
      مختلف و نوین می‌پردازد.
    </p>
    <img src="/images/modern-web-development-2024.jpg" alt="توسعه وب مدرن" width="800" height="450" loading="lazy" />
    <blockquote class="highlight">
      <p><em>توسعه وب مدرن نیازمند تسلط بر ابزارها و فریمورک‌های روز دنیاست.</em></p>
    </blockquote>
  </section>

  <section class="frameworks">
    <h2>فریمورک‌های محبوب و پرکاربرد</h2>
    <p>در حال حاضر چندین فریمورک <strong>بسیار محبوب</strong> و <em>کارآمد</em> برای توسعه وب وجود دارد:</p>
    <ul class="framework-list enhanced">
      <li><a href="/react-guide" title="React Framework - راهنمای کامل" target="_blank">React</a> - قدرتمندترین کتابخانه جاوااسکریپت</li>
      <li><a href="/vue" title="Vue.js Framework" target="_blank">Vue.js</a> - فریمورک پیشرونده و انعطاف‌پذیر</li>
      <li><a href="/svelte" title="Svelte Framework" target="_blank">Svelte</a> - فریمورک نوین و سریع</li>
      <li><a href="/nextjs" title="Next.js Framework" target="_blank">Next.js</a> - فریمورک React برای تولید</li>
    </ul>
    <div class="framework-comparison">
      <h3>مقایسه فریمورک‌ها</h3>
      <p>هر فریمورک مزایا و معایب خاص خود را دارد.</p>
    </div>
  </section>

  <section class="best-practices">
    <h2>بهترین شیوه‌های کدنویسی حرفه‌ای</h2>
    <p>برای نوشتن کد تمیز، حرفه‌ای و قابل نگهداری، باید موارد زیر را به دقت رعایت کنید:</p>
    <ol>
      <li>استفاده از نام‌گذاری معنادار و استاندارد برای متغیرها و توابع</li>
      <li>نوشتن کد قابل خواندن، مستند و با کامنت‌های مفید</li>
      <li>استفاده از الگوهای طراحی معتبر و اصول SOLID</li>
      <li>تست‌نویسی و پوشش کد مناسب</li>
      <li>بررسی و رفع مشکلات امنیتی</li>
    </ol>
  </section>

  <section class="code-examples">
    <h2>نمونه کدها و مثال‌های کاربردی</h2>
    <p>در اینجا یک مثال پیشرفته از کد TypeScript با مدیریت خطا را مشاهده می‌کنید:</p>
    <pre><code>async function getUserData(id: string) {
  try {
    const response = await fetch(\`/api/v2/users/\${id}\`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}</code></pre>
    <div class="code-note">
      <p><strong>نکته:</strong> همیشه از async/await برای عملیات ناهمزمان استفاده کنید.</p>
    </div>
  </section>

  <section class="resources">
    <h2>منابع یادگیری پیشنهادی</h2>
    <div class="resource-card featured">
      <h3>کتاب‌ها و دوره‌های توصیه شده</h3>
      <p>برای یادگیری عمیق‌تر و حرفه‌ای، این کتاب‌ها و دوره‌های آموزشی را مطالعه و دنبال کنید.</p>
      <ul>
        <li>Clean Code - رابرت مارتین</li>
        <li>You Don't Know JS - کایل سیمپسون</li>
        <li>دوره‌های Udemy و Coursera</li>
      </ul>
    </div>
    <div class="video-resources">
      <h3>ویدیوهای آموزشی</h3>
      <p>کانال‌های یوتیوب معتبر برای یادگیری توسعه وب</p>
    </div>
  </section>

  <section class="newsletter">
    <h2>عضویت در خبرنامه</h2>
    <p>برای دریافت آخرین مقالات و آموزش‌ها در خبرنامه ما عضو شوید.</p>
    <form class="newsletter-form">
      <input type="email" placeholder="ایمیل خود را وارد کنید" required />
      <button type="submit">عضویت</button>
    </form>
  </section>

  <footer class="post-footer enhanced">
    <p>برای اطلاعات بیشتر و مشاوره رایگان با ما در تماس باشید.</p>
    <button type="submit" class="primary">ارسال نظر</button>
    <div class="social-links">
      <a href="https://twitter.com/example" target="_blank">توییتر</a>
      <a href="https://github.com/example" target="_blank">گیت‌هاب</a>
    </div>
  </footer>
</article>
`;

/**
 * Summary of changes demonstrated:
 *
 * 1. ATTRIBUTE CHANGES:
 *    - article: class changed from "draft" to "published featured", added data-version
 *    - header: added "updated" class
 *    - div.meta: added "enhanced" class
 *    - img: changed src, width, added height and loading attributes
 *    - multiple links: changed href, added target="_blank"
 *    - button: changed type, removed disabled, added class
 *
 * 2. TEXT CHANGES:
 *    - h1: "جامع" → "جامع و کاربردی", added "و پیشرفته"
 *    - Multiple word-level changes in paragraphs
 *    - "محبوب" (b tag) → "بسیار محبوب" (strong tag)
 *
 * 3. ADDED ELEMENTS:
 *    - New span for reading time
 *    - New div with tags
 *    - blockquote section
 *    - New list item (Next.js)
 *    - New div.framework-comparison
 *    - Two new list items in best practices
 *    - New div.code-note
 *    - New ul in resources
 *    - New div.video-resources
 *    - Entire newsletter section
 *    - Social links div in footer
 *
 * 4. REMOVED ELEMENTS:
 *    - Angular list item
 *
 * 5. TAG CHANGES:
 *    - b → strong in frameworks section
 *
 * 6. NESTED CHANGES:
 *    - Changes within changed elements
 *    - Multiple levels of modifications
 */
