import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isWeekend, 
  differenceInCalendarDays,
  isBefore,
  getMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from '../types';

interface DateManagerProps {
  ranges: DateRange[];
  onRangesChange?: (ranges: DateRange[]) => void;
  onAdd?: (start: Date, end: Date) => void;
  actionContent?: React.ReactNode;
  hideList?: boolean;
  addButtonLabel?: string;
  disableAdd?: boolean;
  disableNightsCalculation?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DateManager: React.FC<DateManagerProps> = ({ 
  ranges, 
  onRangesChange, 
  onAdd, 
  actionContent, 
  hideList = false,
  addButtonLabel = 'Add Range',
  disableAdd = false,
  disableNightsCalculation = false
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  
  const [yearInput, setYearInput] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    setYearInput(currentMonth.getFullYear().toString());
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    const year = currentMonth.getFullYear();
    setCurrentMonth(new Date(year, newMonth, 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setYearInput(valStr);

    const val = parseInt(valStr);
    if (!isNaN(val) && val > 1900 && val < 2100) {
      const month = getMonth(currentMonth);
      setCurrentMonth(new Date(val, month, 1));
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDayIndex = (daysInMonth[0].getDay() + 6) % 7;
  const emptySlots = Array(startDayIndex).fill(null);

  const handleDateClick = (date: Date) => {
    if (!tempStart) {
      setTempStart(date);
      setTempEnd(null);
    } else if (!tempEnd) {
      if (isBefore(date, tempStart)) {
        setTempStart(date);
      } else if (isSameDay(date, tempStart)) {
        if (disableNightsCalculation) {
          setTempEnd(date);
        }
      } else {
        setTempEnd(date);
      }
    } else {
      setTempStart(date);
      setTempEnd(null);
    }
  };

  const handleAdd = () => {
    /* v8 ignore next */
    if (!tempStart || !tempEnd) return;

    if (onAdd) {
      onAdd(tempStart, tempEnd);
      setTempStart(null);
      setTempEnd(null);
      return;
    }

    if (onRangesChange) {
      const nights = differenceInCalendarDays(tempEnd, tempStart);
      if (nights < 1 && !disableNightsCalculation) return; 

      const newRange: DateRange = {
        id: Math.random().toString(36).substring(2, 9),
        start: tempStart,
        end: tempEnd,
        nights: nights
      };

      const updated = [...ranges, newRange].sort((a, b) => a.start.getTime() - b.start.getTime());
      onRangesChange(updated);
      
      setTempStart(null);
      setTempEnd(null);
    }
  };

  const removeRange = (id: string) => {
    if (onRangesChange) {
      onRangesChange(ranges.filter(r => r.id !== id));
    }
  };

  const isSelected = (date: Date) => {
    if (tempStart && isSameDay(date, tempStart)) return true;
    if (tempEnd && isSameDay(date, tempEnd)) return true;
    return false;
  };

  const isInRange = (date: Date) => {
    if (tempStart && tempEnd) {
      return date > tempStart && date < tempEnd;
    }
    return false;
  };

  const isConfiguredRange = (date: Date) => {
    return ranges.some(range => 
      isSameDay(date, range.start) || 
      isSameDay(date, range.end) || 
      (date > range.start && date < range.end)
    );
  };

  return (
    <div className="stack stack-6">
      {/* Calendar UI */}
      <div className="calendar-wrapper">
        
        {/* Navigation Header */}
        <div className="calendar-nav">
          <button onClick={prevMonth} className="calendar-nav-btn">
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex-row gap-2">
            <select 
              value={getMonth(currentMonth)} 
              onChange={handleMonthSelect}
              className="calendar-month-select"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <input 
              type="number"
              value={yearInput}
              onChange={handleYearChange}
              className="calendar-year-input"
            />
          </div>

          <button onClick={nextMonth} className="calendar-nav-btn">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Days Header */}
        <div className="calendar-days-header">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div className="calendar-days-header-weekend">Sat</div>
          <div className="calendar-days-header-weekend">Sun</div>
        </div>

        {/* Days Grid */}
        <div className="calendar-grid">
          {emptySlots.map((_, i) => <div key={`empty-${i}`} />)}
          
          {daysInMonth.map((date) => {
            const isWknd = isWeekend(date);
            const selected = isSelected(date);
            const inRange = isInRange(date);
            const isExisting = isConfiguredRange(date);
            
            let classNames = 'calendar-day';
            
            if (selected) {
              classNames += ' calendar-day--selected';
            } else if (inRange) {
              classNames += ' calendar-day--in-range';
            } else if (isExisting) {
              classNames += ' calendar-day--existing';
            } else if (isWknd) {
              classNames += ' calendar-day--weekend';
            }

            return (
              <button
                key={format(date, 'yyyy-MM-dd')}
                onClick={() => handleDateClick(date)}
                className={classNames}
              >
                {format(date, 'd')}
              </button>
            );
          })}
        </div>

        {/* Selection Status & Action */}
        <div className="calendar-status-bar">
          <div className="calendar-status-text">
            {tempStart && !tempEnd && <span>{disableNightsCalculation ? 'Select End Date' : 'Select Check-Out Date'}</span>}
            {!tempStart && <span>{disableNightsCalculation ? 'Select Start Date' : 'Select Check-In Date'}</span>}
            {tempStart && tempEnd && (
               <span className="calendar-selection-badge">
                 {format(tempStart, 'd MMM')} - {format(tempEnd, 'd MMM')} 
                 {!disableNightsCalculation && ` • ${differenceInCalendarDays(tempEnd, tempStart)} Nights`}
               </span>
            )}
          </div>
          
          <div className="calendar-action-area">
            {actionContent}
            <button 
              onClick={handleAdd}
              disabled={!tempStart || !tempEnd || disableAdd}
              className="btn-calendar-add"
            >
              <Plus size={18} />
              {addButtonLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Selected Ranges List */}
      {!hideList && (
        <div className="ranges-list">
          <h3 className="ranges-list-title">
            <CalendarIcon size={18} style={{ color: 'var(--indigo-500)' }} />
            Scheduled Stays
          </h3>
          {ranges.length === 0 ? (
            <div className="ranges-empty">
              No dates added yet. Use the calendar above to schedule a stay.
            </div>
          ) : (
            <div className="stack stack-3">
              {ranges.map((range, idx) => (
                <div key={range.id} className="range-item">
                  <div className="range-item-content">
                    <span className="range-item-label">Stay {idx + 1}</span>
                    <div className="range-item-dates">
                      {format(range.start, 'EEE, dd MMM')} 
                      <span className="range-item-arrow">→</span> 
                      {format(range.end, 'EEE, dd MMM yyyy')}
                    </div>
                    {!disableNightsCalculation && (
                      <span className="range-item-nights">
                        {range.nights} Night{range.nights !== 1 && 's'}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => removeRange(range.id)}
                    className="btn-icon-delete"
                    title="Remove this stay"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateManager;