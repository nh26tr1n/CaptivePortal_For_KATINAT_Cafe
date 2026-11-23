'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

type ProfileFormProps = {
  profile: Profile | null;
  onContinue: () => void;
};

export function ProfileForm({ profile, onContinue }: ProfileFormProps) {
  const t = useTranslations('portal');
  const common = useTranslations('common');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [gender, setGender] = useState(profile?.gender ?? '');
  const [ageGroup, setAgeGroup] = useState(profile?.age_group ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const body: Record<string, string> = {};
    if (fullName.trim()) body.full_name = fullName.trim();
    if (gender) body.gender = gender;
    if (ageGroup) body.age_group = ageGroup;

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json() as { ok?: boolean };
      if (!response.ok || !result.ok) {
        toast.error(t('profileSaveError'));
        return;
      }

      onContinue();
    } catch {
      toast.error(t('profileSaveError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">{t('profileFormTitle')}</h2>
        <p className="text-sm text-stone-600">{t('profileFormDescription')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-full-name">{t('fullName')}</Label>
        <Input
          autoComplete="name"
          id="profile-full-name"
          maxLength={100}
          onChange={(event) => setFullName(event.target.value)}
          value={fullName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-gender">{t('gender')}</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="profile-gender"
          onChange={(event) => setGender(event.target.value)}
          value={gender}
        >
          <option value="">{t('selectPlaceholder')}</option>
          <option value="male">{t('genderMale')}</option>
          <option value="female">{t('genderFemale')}</option>
          <option value="other">{t('genderOther')}</option>
          <option value="undisclosed">{t('genderUndisclosed')}</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-age-group">{t('ageGroup')}</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="profile-age-group"
          onChange={(event) => setAgeGroup(event.target.value)}
          value={ageGroup}
        >
          <option value="">{t('selectPlaceholder')}</option>
          <option value="under_18">{t('ageUnder18')}</option>
          <option value="18_24">{t('age18To24')}</option>
          <option value="25_34">{t('age25To34')}</option>
          <option value="35_44">{t('age35To44')}</option>
          <option value="45_54">{t('age45To54')}</option>
          <option value="55_plus">{t('age55Plus')}</option>
          <option value="undisclosed">{t('ageUndisclosed')}</option>
        </select>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button disabled={isSaving} onClick={onContinue} type="button" variant="outline">
          {t('skip')}
        </Button>
        <Button disabled={isSaving} type="submit">
          {isSaving ? common('loading') : t('saveProfile')}
        </Button>
      </div>
    </form>
  );
}
