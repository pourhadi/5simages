import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#111111] border-t border-gray-800 py-4 text-gray-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex space-x-4">
          <Link href="/terms" className="hover:text-white">
            Terms and Conditions
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/support" className="hover:text-white">
            Support
          </Link>
        </div>
        <div className="mt-2 sm:mt-0">
          © {new Date().getFullYear()} StillMotion.ai
        </div>
      </div>
    </footer>
  );
}