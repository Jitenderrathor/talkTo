'use client';

import React, { useRef, useEffect } from 'react';

interface CalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  activityDates: Set<string>; // Set of dates with recorded conversations
}

export default function CalendarStrip({
  selectedDate,
  onSelectDate,
  activityDates,
}: CalendarStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate date list: 10 days ago to 3 days from now
  const dates = React.useMemo(() => {
    const list = [];
    const today = new Date();
    
    for (let i = -10; i <= 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., Mon
      const dayNumber = d.getDate();
      const isToday = i === 0;

      list.push({
        formattedDate,
        dayName,
        dayNumber,
        isToday,
      });
    }
    return list;
  }, []);

  const headerText = React.useMemo(() => {
    const selected = new Date(selectedDate);
    if (isNaN(selected.getTime())) {
      return new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return selected.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [selectedDate]);

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const selectedEl = container.querySelector('[data-selected="true"]');
      if (selectedEl) {
        const containerWidth = container.offsetWidth;
        const selectedLeft = (selectedEl as HTMLElement).offsetLeft;
        const selectedWidth = (selectedEl as HTMLElement).offsetWidth;
        container.scrollTo({
          left: selectedLeft - containerWidth / 2 + selectedWidth / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [selectedDate]);

  return (
    <div className="flex flex-col bg-transparent border-b border-white/[0.06] py-2.5 shrink-0">
      {/* Month/Year title */}
      <div className="px-4 mb-2 flex items-center justify-between text-[11px] font-medium text-gray-400">
        <span className="font-semibold text-gray-300">{headerText}</span>
        <button
          onClick={() => {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            onSelectDate(`${y}-${m}-${d}`);
          }}
          className="text-[10px] text-violet-400 hover:text-violet-300 font-medium cursor-pointer"
        >
          Today
        </button>
      </div>

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dates.map((dateObj) => {
          const isSelected = dateObj.formattedDate === selectedDate;
          const hasActivity = activityDates.has(dateObj.formattedDate);

          return (
            <button
              key={dateObj.formattedDate}
              data-selected={isSelected}
              onClick={() => onSelectDate(dateObj.formattedDate)}
              className={`flex flex-col items-center justify-between shrink-0 w-11 py-2 rounded-xl transition-all relative cursor-pointer ${
                isSelected
                  ? 'bg-violet-600 text-white font-semibold shadow-sm'
                  : 'bg-white/[0.03] text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]'
              }`}
            >
              {/* Day Name */}
              <span className={`text-[10px] uppercase font-medium ${isSelected ? 'text-violet-100' : 'text-gray-500'}`}>
                {dateObj.dayName}
              </span>

              {/* Day Number */}
              <span className="text-xs font-semibold mt-0.5 leading-none">
                {dateObj.dayNumber}
              </span>

              {/* Activity Dot */}
              <div className="flex gap-1 items-center justify-center mt-1 h-1">
                {hasActivity && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-400'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
