import { z } from 'zod';

export const campaignContentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
  html_content: z.string().trim().min(1).max(100_000),
  recipient_ids: z.array(z.string().uuid()).max(10_000)
}).strict();

export const campaignIdSchema = z.object({ campaign_id: z.string().uuid() }).strict();
export type CampaignContentInput = z.infer<typeof campaignContentSchema>;

export const voucherCreateSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(32).regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/),
  description: z.string().trim().max(500).nullable(),
  discount_type: z.enum(['percent', 'fixed']),
  discount_value: z.number().positive(),
  max_uses: z.number().int().positive().nullable(),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  active: z.boolean()
}).strict().superRefine((value, context) => {
  if (value.expires_at) {
    const parsedDate = new Date(`${value.expires_at}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value.expires_at) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['expires_at'], message: 'invalid_date' });
    }
  }
  if (value.discount_type === 'percent' && value.discount_value > 100) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['discount_value'], message: 'percent_over_100' });
  }
});

export const voucherRedemptionSchema = z.object({
  code: z.string().trim().min(1).max(32),
  customer_email: z.string().trim().email().max(320)
}).strict();

export const voucherCampaignSchema = z.object({ campaign_id: z.string().uuid() }).strict();
export type VoucherCreateInput = z.infer<typeof voucherCreateSchema>;
