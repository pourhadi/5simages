import AuthPagesV2 from '@/components/v2/AuthPages';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <AuthPagesV2 mode="login" searchParams={searchParams} />;
} 