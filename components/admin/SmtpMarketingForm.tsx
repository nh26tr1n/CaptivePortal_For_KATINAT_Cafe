'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { CheckCircle2, Eye, LoaderCircle, Mail, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { normalizeEmailHtml } from '@/lib/email/normalizeHtml';

type CsvRecipient = { name: string; email: string; consent: string };
type CsvRow = Record<string, string | undefined>;
type SendSummary = { sent: number; failed: number; skipped: number };
const BATCH_SIZE = 20;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SMTP_ERROR_CODES = new Set([
  'unauthorized',
  'invalid_origin',
  'invalid_json',
  'invalid_request',
  'no_consented_recipients',
  'smtp_auth_failed',
  'smtp_connection_failed',
  'database_unavailable',
  'consent_lookup_failed'
]);

export function SmtpMarketingForm() {
  const t = useTranslations('admin');
  const fileInput = useRef<HTMLInputElement>(null);
  const [senderEmail, setSenderEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [csvReady, setCsvReady] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [checked, setChecked] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<SendSummary | null>(null);
  const [sendError, setSendError] = useState('');

  const eligibleRecipients = useMemo(() => {
    const unique = new Map<string, CsvRecipient>();
    for (const row of rows) {
      const name = row.name?.trim() ?? '';
      const email = row.email?.trim() ?? '';
      const consent = row.consent?.trim() ?? '';
      const accepted = consent.toLowerCase() === 'true' || consent.toLowerCase() === 'yes';
      if (!name || !accepted || !EMAIL_PATTERN.test(email) || unique.has(email.toLowerCase())) continue;
      unique.set(email.toLowerCase(), { name, email, consent });
    }
    return [...unique.values()];
  }, [rows]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setCsvFileName(file?.name ?? '');
    setRows([]);
    setCsvReady(false);
    setChecked(false);
    setSummary(null);
    setProgress(0);
    setCsvError('');
    setSendError('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError(t('smtpCsvOnly'));
      return;
    }

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim().toLowerCase(),
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const missingHeaders = ['name', 'email', 'consent'].filter((header) => !headers.includes(header));
        if (missingHeaders.length) {
          setCsvError(t('smtpCsvHeadersMissing', { headers: missingHeaders.join(', ') }));
          return;
        }
        const fatalError = result.errors.find((error) => error.type === 'Quotes' || error.type === 'Delimiter');
        if (fatalError) {
          setCsvError(t('smtpCsvParseError', { error: fatalError.message }));
          return;
        }
        setRows(result.data);
        setCsvReady(true);
      },
      error: (error) => setCsvError(t('smtpCsvParseError', { error: error.message }))
    });
  }

  async function sendEmails() {
    if (!checked || !eligibleRecipients.length || !senderEmail || !appPassword || !subject.trim() || !html.trim()) return;
    if (!window.confirm(t('smtpConfirmSend', { count: eligibleRecipients.length }))) return;

    setSending(true);
    setProgress(0);
    setSummary(null);
    setSendError('');
    const totals: SendSummary = { sent: 0, failed: 0, skipped: 0 };
    let processed = 0;
    let userFacingError = t('smtpSendError');

    try {
      for (let offset = 0; offset < eligibleRecipients.length; offset += BATCH_SIZE) {
        const batch = eligibleRecipients.slice(offset, offset + BATCH_SIZE);
        const response = await fetch('/api/send-smtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderEmail, appPassword, subject: subject.trim(), html, recipients: batch })
        });
        let result: Partial<SendSummary> & { error?: string };
        try {
          result = await response.json() as Partial<SendSummary> & { error?: string };
        } catch {
          throw new Error('smtp_response_invalid');
        }
        if (!response.ok) {
          const errorCode = result.error ?? 'unknown';
          userFacingError = SMTP_ERROR_CODES.has(errorCode)
            ? t(`smtpError_${errorCode}`)
            : t('smtpError_unknown');
          throw new Error('smtp_request_failed');
        }

        totals.sent += result.sent ?? 0;
        totals.failed += result.failed ?? 0;
        totals.skipped += result.skipped ?? 0;
        processed += batch.length;
        setProgress(Math.round((processed / eligibleRecipients.length) * 100));
        setSummary({ ...totals });
      }
    } catch (error) {
      setSendError(error instanceof Error && error.message === 'smtp_request_failed'
        ? userFacingError
        : t('smtpSendError'));
    } finally {
      setSending(false);
    }
  }

  const htmlPreview = useMemo(() => normalizeEmailHtml(html), [html]);
  const canSend = checked && eligibleRecipients.length > 0 && Boolean(
    senderEmail && appPassword && subject.trim() && html.trim()
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('smtpAccountTitle')}</CardTitle>
          <CardDescription>{t('smtpAccountDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtp-sender">{t('smtpSenderEmail')}</Label>
            <Input autoComplete="email" id="smtp-sender" onChange={(event) => setSenderEmail(event.target.value)} placeholder="name@gmail.com" type="email" value={senderEmail} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-password">{t('smtpAppPassword')}</Label>
            <Input autoComplete="new-password" id="smtp-password" onChange={(event) => setAppPassword(event.target.value)} type="password" value={appPassword} />
            <p className="text-xs text-muted-foreground">{t('smtpPasswordNote')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('smtpCsvTitle')}</CardTitle>
          <CardDescription>{t('smtpCsvDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input accept=".csv,text/csv" className="sr-only" onChange={(event) => void onFileChange(event)} ref={fileInput} type="file" />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => fileInput.current?.click()} type="button" variant="outline">
              <Upload aria-hidden="true" />{t('smtpChooseCsv')}
            </Button>
            <span className="text-sm text-muted-foreground">{csvFileName || t('smtpNoFile')}</span>
            <Button disabled={!csvReady || Boolean(csvError)} onClick={() => setChecked(true)} type="button">
              <CheckCircle2 aria-hidden="true" />{t('smtpCheckCsv')}
            </Button>
          </div>
          {csvError && <p className="text-sm text-destructive" role="alert">{csvError}</p>}
          {checked && (
            <p className="text-sm" role="status">
              {t('smtpValidCount', { count: eligibleRecipients.length })} · {t('smtpIgnoredCount', { count: rows.length - eligibleRecipients.length })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('smtpContentTitle')}</CardTitle>
          <CardDescription>{t('smtpContentDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-subject">{t('smtpSubject')}</Label>
            <Input id="smtp-subject" maxLength={200} onChange={(event) => setSubject(event.target.value)} value={subject} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-html">{t('smtpHtml')}</Label>
            <textarea
              className="min-h-64 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id="smtp-html"
              maxLength={50_000}
              onChange={(event) => setHtml(event.target.value)}
              placeholder={t('smtpHtmlPlaceholder')}
              value={html}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!html.trim()} onClick={() => setPreviewVisible((visible) => !visible)} type="button" variant="outline">
              <Eye aria-hidden="true" />{previewVisible ? t('smtpHidePreview') : t('smtpPreview')}
            </Button>
            <span className="text-xs text-muted-foreground">{t('smtpNameToken')}</span>
          </div>
          {previewVisible && (
            <iframe
              className="h-80 w-full rounded-md border bg-white"
              referrerPolicy="no-referrer"
              sandbox=""
              srcDoc={htmlPreview}
              title={t('smtpPreviewTitle')}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!canSend || sending} onClick={() => void sendEmails()} type="button">
              {sending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Mail aria-hidden="true" />}
              {sending ? t('smtpSending') : t('smtpStartSend')}
            </Button>
            {checked && <span className="text-sm text-muted-foreground">{t('smtpRecipientCount', { count: eligibleRecipients.length })}</span>}
          </div>
          {sending && (
            <div aria-label={t('smtpProgressLabel')} className="space-y-2" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[#0F3B45] transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm text-muted-foreground">{t('smtpProgress', { progress })}</p>
            </div>
          )}
          {sendError && <p className="text-sm text-destructive" role="alert">{sendError}</p>}
          {summary && !sending && (
            <p className="text-sm" role="status">
              {t('smtpResults', { sent: summary.sent, failed: summary.failed, skipped: summary.skipped })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
