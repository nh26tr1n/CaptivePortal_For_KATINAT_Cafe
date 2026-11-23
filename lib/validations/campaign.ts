import { z } from 'zod';

export const campaignContentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
  html_content: z.string().trim().min(1).max(100_000),
  recipient_ids: z.array(z.string().uuid()).max(10_000)
}).strict();

export const campaignIdSchema = z.object({ campaign_id: z.string().uuid() }).strict();

export type CampaignContentInput = z.infer<typeof campaignContentSchema>;
