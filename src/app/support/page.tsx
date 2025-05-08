export const metadata = {
  title: 'Support - StillMotion.ai',
  description: 'Support page for StillMotion.ai',
};

export default function SupportPage() {
  return (
    <section className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Support</h1>
      <p className="mb-4">
        If you have any questions, comments, or issues, please email us at{' '}
        <a
          href="mailto:support@stillmotion.ai"
          className="text-[#3EFFE2] hover:underline"
        >
          support@stillmotion.ai
        </a>.
      </p>
    </section>
  );
}