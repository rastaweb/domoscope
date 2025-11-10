import { useState } from 'react';
import './App.css';
import type { ExtendedCompareOptions } from '@rastaweb/domoscope';

import { oldContent, newContent } from './constants/diffContent';
import { DiffViewer } from './components/DiffViewer';
import { DiffControls } from './components/DiffControls';

function App() {
  const [diffOptions, setDiffOptions] = useState<Partial<ExtendedCompareOptions>>({
    watchedTags: ['a', 'img', 'button', 'form', 'input', 'blockquote', 'code', 'pre'],
    wrapperTag: 'span',
  });

  const handleOptionsChange = (newOptions: Partial<ExtendedCompareOptions>) => {
    setDiffOptions((prev) => ({
      ...prev,
      ...newOptions,
    }));
  };

  const handleExport = () => {
    // Export functionality - could generate downloadable HTML
    const exportContent = `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Domoscope Diff Export</title>
  <style>
    .diff-added { background-color: #d4edda; }
    .diff-removed { background-color: #f8d7da; }
    .diff-element-changed { border: 2px solid #ffc107; }
    .diff-attribute-changed { border: 2px solid #17a2b8; }
  </style>
</head>
<body>
  <h1>Domoscope Diff Results</h1>
  <div class="new-content">${newContent}</div>
</body>
</html>
    `;

    const blob = new Blob([exportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'domoscope-diff.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="icon">🔍</span>
            Domoscope Playground
          </h1>
          <p className="app-subtitle">نمایشگاه جامع قابلیت‌های کتابخانه تشخیص تفاوت HTML</p>
        </div>
        <div className="header-badges">
          <span className="badge badge-primary">React</span>
          <span className="badge badge-secondary">TypeScript</span>
          <span className="badge badge-success">Domoscope</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Sidebar with Controls */}
        <aside className="app-sidebar">
          <DiffControls onOptionsChange={handleOptionsChange} onExport={handleExport} />

          {/* Feature Highlights */}
          <div className="feature-highlights">
            <h3 className="highlights-title">✨ قابلیت‌های نمایش داده شده</h3>
            <ul className="highlights-list">
              <li>🔄 تشخیص تغییرات متنی (سطح کلمه)</li>
              <li>🏷️ ردیابی تغییرات تگ‌ها</li>
              <li>⚙️ نمایش تغییرات ویژگی‌ها</li>
              <li>➕ شناسایی عناصر اضافه شده</li>
              <li>➖ شناسایی عناصر حذف شده</li>
              <li>📊 آمار جامع تغییرات</li>
              <li>🎨 رنگ‌بندی و برجسته‌سازی</li>
              <li>💡 راهنما و Tooltip</li>
              <li>🔗 پشتیبانی از لینک‌ها و تصاویر</li>
              <li>🌐 پشتیبانی کامل از RTL</li>
            </ul>
          </div>

          {/* Example Summary */}
          <div className="example-summary">
            <h3 className="summary-title">📋 خلاصه مثال</h3>
            <p className="summary-text">این نمونه شامل تغییرات گسترده‌ای از انواع مختلف است:</p>
            <ul className="summary-list">
              <li>تغییر عنوان مقاله</li>
              <li>افزودن بخش‌های جدید</li>
              <li>حذف و اصلاح لینک‌ها</li>
              <li>تغییر ویژگی‌های تصاویر</li>
              <li>به‌روزرسانی محتوای متنی</li>
              <li>تغییر کلاس‌ها و ویژگی‌ها</li>
            </ul>
          </div>
        </aside>

        {/* Main Diff Viewer */}
        <section className="app-content">
          <DiffViewer
            oldContent={oldContent}
            newContent={newContent}
            options={diffOptions}
            title="مقایسه جامع محتوا"
            description="این نمایشگر تمام تفاوت‌های بین نسخه قدیم و جدید مقاله را نشان می‌دهد"
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-text">
            ساخته شده با ❤️ توسط <strong>Domoscope</strong>
          </p>
          <div className="footer-links">
            <a
              href="https://github.com/rastaweb/domoscope"
              target="_blank"
              rel="noopener noreferrer"
            >
              گیت‌هاب
            </a>
            <span className="separator">•</span>
            <a
              href="https://npmjs.com/package/@rastaweb/domoscope"
              target="_blank"
              rel="noopener noreferrer"
            >
              NPM
            </a>
            <span className="separator">•</span>
            <a href="https://rastaweb.com" target="_blank" rel="noopener noreferrer">
              RastaWeb
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
