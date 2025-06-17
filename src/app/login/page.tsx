import AuthPagesV2 from '@/components/v2/AuthPages';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  return <AuthPagesV2 mode="login" searchParams={params} />;
} 