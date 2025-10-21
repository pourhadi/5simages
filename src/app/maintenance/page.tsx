export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 md:p-12 shadow-2xl border border-white/20">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              StillMotion.ai
            </h1>
            <div className="w-20 h-1 bg-gradient-to-r from-purple-400 to-blue-400 mx-auto rounded-full mb-8"></div>
          </div>

          <div className="space-y-6">
            <div className="inline-block p-4 bg-yellow-500/20 rounded-full mb-4">
              <svg
                className="w-16 h-16 text-yellow-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Temporarily Offline
            </h2>

            <p className="text-xl text-gray-200 mb-6">
              We&apos;re currently performing scheduled maintenance to improve your experience.
            </p>

            <p className="text-lg text-gray-300">
              We&apos;ll be back online shortly. Thank you for your patience!
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-white/20">
            <p className="text-gray-400 text-sm">
              For urgent inquiries, please contact{' '}
              <a
                href="mailto:support@stillmotion.ai"
                className="text-blue-300 hover:text-blue-200 underline transition-colors"
              >
                support@stillmotion.ai
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 text-gray-400 text-sm">
          Status: Under Maintenance
        </div>
      </div>
    </div>
  );
}
