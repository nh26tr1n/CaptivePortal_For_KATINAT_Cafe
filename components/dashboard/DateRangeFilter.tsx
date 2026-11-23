'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addCalendarDays, getCafeToday } from '@/services/date-range';

type DateRangeFilterProps = {
  fromDate: string;
  toDate: string;
  preset: string;
};

type Preset = 'today' | 'last7' | 'last30' | 'month' | 'custom';

export function DateRangeFilter({ fromDate, toDate, preset: initialPreset }: DateRangeFilterProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [preset, setPreset] = useState<Preset>(
    ['today', 'last7', 'last30', 'month', 'custom'].includes(initialPreset)
      ? initialPreset as Preset
      : 'last7'
  );
  const [from, setFrom] = useState(fromDate);
  const [to, setTo] = useState(toDate);

  useEffect(() => {
    setFrom(fromDate);
    setTo(toDate);
    if (['today', 'last7', 'last30', 'month', 'custom'].includes(initialPreset)) {
      setPreset(initialPreset as Preset);
    }
  }, [fromDate, initialPreset, toDate]);

  function navigate(nextPreset: Preset, nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', nextPreset);
    params.set('from', nextFrom);
    params.set('to', nextTo);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handlePresetChange(value: Preset) {
    setPreset(value);
    const today = getCafeToday();
    if (value === 'custom') return;
    if (value === 'today') {
      setFrom(today);
      setTo(today);
      navigate(value, today, today);
    } else if (value === 'last7') {
      const start = addCalendarDays(today, -6);
      setFrom(start);
      setTo(today);
      navigate(value, start, today);
    } else if (value === 'last30') {
      const start = addCalendarDays(today, -29);
      setFrom(start);
      setTo(today);
      navigate(value, start, today);
    } else {
      const start = `${today.slice(0, 7)}-01`;
      setFrom(start);
      setTo(today);
      navigate(value, start, today);
    }
  }

  function applyCustomRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !to || from > to) return;
    navigate('custom', from, to);
  }

  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={applyCustomRange}>
      <div className="min-w-40 space-y-2">
        <Label htmlFor="date-range-preset">{t('dateRange')}</Label>
        <Select onValueChange={(value) => handlePresetChange(value as Preset)} value={preset}>
          <SelectTrigger id="date-range-preset"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t('today')}</SelectItem>
            <SelectItem value="last7">{t('last7Days')}</SelectItem>
            <SelectItem value="last30">{t('last30Days')}</SelectItem>
            <SelectItem value="month">{t('thisMonth')}</SelectItem>
            <SelectItem value="custom">{t('customRange')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {preset === 'custom' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="date-range-from">{t('fromDate')}</Label>
            <Input id="date-range-from" max={to} onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-range-to">{t('toDate')}</Label>
            <Input id="date-range-to" min={from} onChange={(event) => setTo(event.target.value)} type="date" value={to} />
          </div>
          <Button disabled={!from || !to || from > to} type="submit">{t('applyRange')}</Button>
        </>
      ) : null}
    </form>
  );
}
