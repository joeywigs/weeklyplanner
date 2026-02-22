'use client';

import { usePlanner } from '@/lib/planner-context';
import { formatDateKey, getShortDayName } from '@/lib/date-utils';

export function WeekSummary() {
  const { weekDates, getDayData, getCalendarEventsForDay } = usePlanner();

  let carlyDropOffs = 0;
  let joeyDropOffs = 0;
  let otherDropOffs = 0;
  let carlyPickUps = 0;
  let joeyPickUps = 0;
  let otherPickUps = 0;
  let carlyDinners = 0;
  let joeyDinners = 0;
  let otherDinners = 0;
  let carlyActivities = 0;
  let joeyActivities = 0;
  let otherActivities = 0;

  const dayBreakdown: {
    label: string;
    dropOff: string;
    pickUp: string;
    cook: string;
    activityCount: number;
  }[] = [];

  for (const date of weekDates) {
    const dateKey = formatDateKey(date);
    const day = getDayData(dateKey, date);
    const calEvents = getCalendarEventsForDay(dateKey);
    const eventOwners = day.calendarEventOwners || {};

    if (day.dropOff === 'Carly') carlyDropOffs++;
    else if (day.dropOff === 'Joey') joeyDropOffs++;
    else if (day.dropOff === 'Other') otherDropOffs++;

    const pickUp = day.pickUp || '';
    if (pickUp === 'Carly') carlyPickUps++;
    else if (pickUp === 'Joey') joeyPickUps++;
    else if (pickUp === 'Other') otherPickUps++;

    if (day.cook === 'Carly') carlyDinners++;
    else if (day.cook === 'Joey') joeyDinners++;
    else if (day.cook === 'Other') otherDinners++;

    for (const a of day.eveningActivities) {
      if (a.owner === 'C') carlyActivities++;
      else if (a.owner === 'J') joeyActivities++;
      else if (a.owner === 'O') otherActivities++;
    }
    for (const ev of calEvents) {
      const o = eventOwners[ev.id];
      if (o === 'C') carlyActivities++;
      else if (o === 'J') joeyActivities++;
      else if (o === 'O') otherActivities++;
    }

    dayBreakdown.push({
      label: getShortDayName(date),
      dropOff: day.dropOff === 'Carly' ? 'C' : day.dropOff === 'Joey' ? 'J' : 'O',
      pickUp: pickUp === 'Carly' ? 'C' : pickUp === 'Joey' ? 'J' : pickUp === 'Other' ? 'O' : '—',
      cook: day.cook === 'Carly' ? 'C' : day.cook === 'Joey' ? 'J' : day.cook === 'Other' ? 'O' : '—',
      activityCount: day.eveningActivities.length + calEvents.length,
    });
  }

  const personBadge = (label: string, color: 'red' | 'blue' | 'yellow') => {
    const colors = {
      red: 'bg-red-100 text-red-700',
      blue: 'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-700',
    };
    return (
      <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[color]}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Week at a Glance</h3>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Drop-offs</span>
            <div className="flex gap-1">
              {personBadge(`C: ${carlyDropOffs}`, 'red')}
              {personBadge(`J: ${joeyDropOffs}`, 'blue')}
              {otherDropOffs > 0 && personBadge(`O: ${otherDropOffs}`, 'yellow')}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Pick-ups</span>
            <div className="flex gap-1">
              {personBadge(`C: ${carlyPickUps}`, 'red')}
              {personBadge(`J: ${joeyPickUps}`, 'blue')}
              {otherPickUps > 0 && personBadge(`O: ${otherPickUps}`, 'yellow')}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Dinners</span>
            <div className="flex gap-1">
              {personBadge(`C: ${carlyDinners}`, 'red')}
              {personBadge(`J: ${joeyDinners}`, 'blue')}
              {otherDinners > 0 && personBadge(`O: ${otherDinners}`, 'yellow')}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Activities</span>
            <div className="flex gap-1">
              {personBadge(`C: ${carlyActivities}`, 'red')}
              {personBadge(`J: ${joeyActivities}`, 'blue')}
              {otherActivities > 0 && personBadge(`O: ${otherActivities}`, 'yellow')}
            </div>
          </div>
        </div>
      </div>

      {/* Daily grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-gray-400 uppercase tracking-wider">
              <th className="text-left py-1 pr-2 font-medium">Day</th>
              <th className="text-center py-1 px-1 font-medium">Drop</th>
              <th className="text-center py-1 px-1 font-medium">Pick</th>
              <th className="text-center py-1 px-1 font-medium">Cook</th>
              <th className="text-center py-1 pl-1 font-medium">Events</th>
            </tr>
          </thead>
          <tbody>
            {dayBreakdown.map((d) => (
              <tr key={d.label} className="border-t border-gray-100">
                <td className="py-1 pr-2 font-semibold text-gray-700">{d.label}</td>
                <td className="py-1 px-1 text-center">
                  <span className={`font-bold ${
                    d.dropOff === 'C' ? 'text-red-600' : d.dropOff === 'J' ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {d.dropOff}
                  </span>
                </td>
                <td className="py-1 px-1 text-center">
                  <span className={`font-bold ${
                    d.pickUp === 'C' ? 'text-red-600' : d.pickUp === 'J' ? 'text-blue-600' : d.pickUp === 'O' ? 'text-yellow-600' : 'text-gray-300'
                  }`}>
                    {d.pickUp}
                  </span>
                </td>
                <td className="py-1 px-1 text-center">
                  <span className={`font-bold ${
                    d.cook === 'C' ? 'text-red-600' : d.cook === 'J' ? 'text-blue-600' : d.cook === 'O' ? 'text-yellow-600' : 'text-gray-300'
                  }`}>
                    {d.cook}
                  </span>
                </td>
                <td className="py-1 pl-1 text-center text-gray-600">{d.activityCount || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
