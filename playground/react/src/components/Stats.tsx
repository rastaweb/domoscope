import type { DiffStats } from '@rastaweb/domoscope';
import React from 'react';

interface StatsProps {
  stats: DiffStats;
}

export const Stats: React.FC<StatsProps> = ({ stats }) => {
  return (
    <div className="bg-linear-to-br from-slate-50 to-slate-100 rounded-xl shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-300 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">آمار تغییرات</h2>
        <p className="text-sm text-slate-600 mt-1">تحلیل جامع تفاوت‌های محتوا</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Changed Tags */}
        <StatCard
          label="تگ‌های تغییر یافته"
          value={stats.totalChangedTags}
          icon="🔄"
          color="blue"
        />

        {/* Added Tags */}
        <StatCard label="تگ‌های اضافه شده" value={stats.totalAddedTags} icon="➕" color="green" />

        {/* Removed Tags */}
        <StatCard label="تگ‌های حذف شده" value={stats.totalRemovedTags} icon="➖" color="red" />

        {/* Added Texts */}
        <StatCard
          label="متن‌های اضافه شده"
          value={stats.totalAddedTexts}
          icon="📝"
          color="emerald"
        />

        {/* Removed Texts */}
        <StatCard
          label="متن‌های حذف شده"
          value={stats.totalRemovedTexts}
          icon="🗑️"
          color="orange"
        />

        {/* Added Words */}
        <StatCard label="کلمات اضافه شده" value={stats.totalAddedWords} icon="💬" color="teal" />

        {/* Removed Words */}
        <StatCard label="کلمات حذف شده" value={stats.totalRemovedWords} icon="💭" color="amber" />

        {/* Total Changes */}
        <StatCard
          label="کل تغییرات"
          value={
            stats.totalChangedTags +
            stats.totalAddedTags +
            stats.totalRemovedTags +
            stats.totalAddedTexts +
            stats.totalRemovedTexts
          }
          icon="📊"
          color="purple"
        />
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Added Tags Detail */}
        {stats.addedTags && Object.keys(stats.addedTags).length > 0 && (
          <DetailSection title="تگ‌های اضافه شده" icon="➕" color="green" items={stats.addedTags} />
        )}

        {/* Removed Tags Detail */}
        {stats.removedTags && Object.keys(stats.removedTags).length > 0 && (
          <DetailSection title="تگ‌های حذف شده" icon="➖" color="red" items={stats.removedTags} />
        )}

        {/* Changed Tags Detail */}
        {stats.changedTags && Object.keys(stats.changedTags).length > 0 && (
          <ChangedTagsSection changedTags={stats.changedTags} />
        )}
      </div>
    </div>
  );
};

// StatCard Component
interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'red' | 'emerald' | 'orange' | 'teal' | 'amber' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div
      className={`${colorClasses[color]} rounded-lg border-2 p-4 transition-all hover:shadow-md hover:scale-105`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
};

// DetailSection Component
interface DetailSectionProps {
  title: string;
  icon: string;
  color: 'green' | 'red';
  items: Record<string, number>;
}

const DetailSection: React.FC<DetailSectionProps> = ({ title, icon, color, items }) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-300 text-green-800',
    red: 'bg-red-50 border-red-300 text-red-800',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg border-2 p-4`}>
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {Object.entries(items).map(([tag, count]) => (
          <div
            key={tag}
            className="flex items-center justify-between bg-white/50 rounded px-3 py-2 text-sm"
          >
            <code className="font-mono font-semibold">&lt;{tag}&gt;</code>
            <span className="bg-white rounded-full px-2 py-1 text-xs font-bold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ChangedTagsSection Component
interface ChangedTagsSectionProps {
  changedTags: Record<
    string,
    {
      count: number;
      changedAttributes: string[];
    }
  >;
}

const ChangedTagsSection: React.FC<ChangedTagsSectionProps> = ({ changedTags }) => {
  return (
    <div className="bg-blue-50 border-2 border-blue-300 text-blue-800 rounded-lg p-4">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        <span>🔄</span>
        <span>تگ‌های تغییر یافته</span>
      </h3>
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {Object.entries(changedTags).map(([tag, data]) => (
          <div key={tag} className="bg-white/50 rounded px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <code className="font-mono font-semibold text-sm">&lt;{tag}&gt;</code>
              <span className="bg-white rounded-full px-2 py-1 text-xs font-bold">
                {data.count}
              </span>
            </div>
            {data.changedAttributes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.changedAttributes.map((attr, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-mono"
                  >
                    {attr}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
