import { CalendarSettings } from '@/components/settings/calendar-settings';

export default function SettingsPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Configure your family planner preferences.
      </p>

      <div className="space-y-4">
        {/* Google Calendar */}
        <CalendarSettings />

        {/* Grocery Item Defaults */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-1">
            Grocery Item Defaults
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Set up the items you usually buy and which store they come from.
          </p>
          <div className="text-center py-6">
            <p className="text-xs text-gray-400 italic">Coming soon</p>
          </div>
        </div>

        {/* School Lunch Menu */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-1">
            School Lunch Menu
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Update the weekly school lunch menu options.
          </p>
          <div className="text-center py-6">
            <p className="text-xs text-gray-400 italic">Coming soon</p>
          </div>
        </div>

        {/* Family Members */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-1">
            Family Members
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Manage drop-off defaults and children&apos;s preferences.
          </p>
          <div className="text-center py-6">
            <p className="text-xs text-gray-400 italic">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
