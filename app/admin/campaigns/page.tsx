import { redirect } from 'next/navigation';

export default async function CampaignsPage() {
  redirect('/admin/dashboard');
}
