'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CreditPurchaseModal from './CreditPurchaseModal';

interface BuyCreditsButtonProps {
  variant?: 'default' | 'small' | 'text';
  className?: string;
}

export default function BuyCreditsButton({ 
  variant = 'default',
  className = ''
}: BuyCreditsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  // Direct navigation option
  const goToCreditsPage = () => {
    router.push('/credits');
  };
  
  // Choose between direct navigation and modal
  const handleClick = () => {
    // Use modal for small or text variants
    if (variant === 'small' || variant === 'text') {
      openModal();
    } else {
      // For the default variant, navigate to the full credits page
      goToCreditsPage();
    }
  };
  
  // Class variations based on variant prop
  const buttonClasses = {
    default: `px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors flex items-center space-x-2 ${className}`,
    small: `px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-full shadow transition-colors flex items-center space-x-1 ${className}`,
    text: `text-blue-600 hover:text-blue-700 hover:underline transition-colors flex items-center space-x-1 ${className}`
  };
  
  return (
    <>
      <button 
        onClick={handleClick}
        className={buttonClasses[variant]}
      >
        <Zap className={variant === 'small' ? 'h-4 w-4' : 'h-5 w-5'} />
        <span>{variant === 'small' ? 'Buy' : 'Buy Credits'}</span>
      </button>
      
      {/* Credit purchase modal */}
      <CreditPurchaseModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </>
  );
} 