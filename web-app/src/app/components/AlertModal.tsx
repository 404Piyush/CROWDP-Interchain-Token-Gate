'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  title: string;
  message: string;
  details?: { discordUsername?: string; walletAddress?: string; assignedRoles?: string[] } | null;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  details
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const backdropVariants = {
    hidden: { 
      opacity: 0,
      backdropFilter: 'blur(0px)'
    },
    visible: { 
      opacity: 1,
      backdropFilter: 'blur(20px)',
      transition: {
        duration: 0.4,
        ease: "easeOut" as const
      }
    },
    exit: {
      opacity: 0,
      backdropFilter: 'blur(0px)',
      transition: {
        duration: 0.3,
        ease: "easeIn" as const
      }
    }
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.7,
      y: -100,
      rotateX: -15
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring" as const,
        damping: 20,
        stiffness: 300,
        delay: 0.1
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      rotateX: 15,
      transition: {
        duration: 0.25,
        ease: "easeIn" as const
      }
    }
  };

  const iconVariants = {
    hidden: { 
      scale: 0, 
      rotate: -180,
      opacity: 0
    },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        delay: 0.3,
        type: "spring" as const,
        damping: 12,
        stiffness: 400
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  const successIcon = (
    <motion.div
      variants={iconVariants}
      initial="hidden"
      animate="visible"
      className="relative w-20 h-20 mx-auto mb-6"
    >
      <motion.div
        variants={pulseVariants}
        animate="pulse"
        className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50"
      >
        <motion.svg 
          className="w-10 h-10 text-white" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
        >
          <motion.path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={3} 
            d="M5 13l4 4L19 7"
          />
        </motion.svg>
      </motion.div>
      {/* Animated rings */}
      <motion.div
        className="absolute inset-0 border-4 border-green-400 rounded-full"
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 1.3, opacity: 0 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-0 border-2 border-green-300 rounded-full"
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3, ease: "easeOut" }}
      />
    </motion.div>
  );

  const errorIcon = (
    <motion.div
      variants={iconVariants}
      initial="hidden"
      animate="visible"
      className="relative w-20 h-20 mx-auto mb-6"
    >
      <motion.div
        variants={pulseVariants}
        animate="pulse"
        className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/50"
      >
        <motion.svg 
          className="w-10 h-10 text-white" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
        >
          <motion.path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={3} 
            d="M6 18L18 6M6 6l12 12"
          />
        </motion.svg>
      </motion.div>
      {/* Animated rings */}
      <motion.div
        className="absolute inset-0 border-4 border-red-400 rounded-full"
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 1.3, opacity: 0 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-0 border-2 border-red-300 rounded-full"
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3, ease: "easeOut" }}
      />
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
        >
          {/* Enhanced backdrop with gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-transparent to-black/60" />
          
          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full mx-4 border-2 ${
              type === 'success' 
                ? 'bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 border-pink-200/50' 
                : 'bg-gradient-to-br from-white via-red-50 to-rose-50 border-red-200/50'
            }`}
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: type === 'success' 
                ? '0 25px 50px -12px rgba(236, 72, 153, 0.4), 0 0 0 1px rgba(236, 72, 153, 0.1)'
                : '0 25px 50px -12px rgba(239, 68, 68, 0.4), 0 0 0 1px rgba(239, 68, 68, 0.1)'
            }}
          >
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${
                    type === 'success' ? 'bg-pink-300/30' : 'bg-red-300/30'
                  }`}
                  initial={{ 
                    x: Math.random() * 400, 
                    y: Math.random() * 300,
                    opacity: 0 
                  }}
                  animate={{ 
                    x: Math.random() * 400, 
                    y: Math.random() * 300,
                    opacity: [0, 1, 0] 
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2, 
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </div>

            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110 hover:rotate-90"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>

            {/* Icon */}
            {type === 'success' ? successIcon : errorIcon}

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
              className={`text-3xl font-bold mb-4 text-center ${
                type === 'success' 
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-600' 
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-600'
              }`}
            >
              {title}
            </motion.h2>

            {/* Message - Only show if no details are provided */}
            {!details && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                className="text-gray-700 mb-6 leading-relaxed text-lg"
              >
                {message}
              </motion.p>
            )}

            {/* Details (for success case) */}
            {details && type === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200/50 rounded-xl p-6 mb-6 text-left"
              >
                <div className="text-center mb-4">
                  <p className="text-base text-gray-700 font-medium leading-tight">
                    You can now go back to the Crowdpunk Discord Server and see all your new roles and channels. No further action needed.
                    <br /><br />
                    <strong className="font-druk text-lg">CROWDPUNK</strong> - Own the KOL you follow!
                  </p>
                </div>
                
                <div className="space-y-3 text-sm text-gray-700">
                  {details.discordUsername && (
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
                      <strong className="text-gray-800">Username:</strong> 
                      <span className="ml-1 text-gray-600">{details.discordUsername}</span>
                    </div>
                  )}
                  
                  {details.walletAddress && (
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                      <strong className="text-gray-800">Wallet:</strong> 
                      <span className="ml-1 font-mono text-xs text-gray-600">
                        {details.walletAddress.slice(0, 8)}...{details.walletAddress.slice(-6)}
                      </span>
                    </div>
                  )}
                  
                  {details.assignedRoles && details.assignedRoles.length > 0 && (
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-rose-500 rounded-full mr-2"></span>
                      <strong className="text-gray-800">Roles assigned:</strong> 
                      <span className="ml-1 text-gray-600">{details.assignedRoles.join(', ')}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Show message for error cases or when no details */}
            {(type === 'error' || !details) && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                className="text-gray-700 mb-6 leading-relaxed text-lg"
              >
                {message}
              </motion.p>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              {type === 'success' && (
                <motion.a
                  href="https://discord.gg/mjYC4a8uwe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/40 text-center font-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🎮 Go back to CROWDPUNKS's Discord
                </motion.a>
              )}
              
              <motion.button
                onClick={onClose}
                className={`px-8 py-4 font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl text-center font-button ${
                  type === 'success' 
                    ? 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 shadow-gray-500/25 hover:shadow-gray-500/40' 
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/25 hover:shadow-red-500/40'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {type === 'success' ? 'Close' : 'Try Again'}
              </motion.button>
            </motion.div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AlertModal;