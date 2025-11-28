import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Logo = ({ size = 'md', showText = true, className = '', noLink = false }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  const prefersReduceMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  const shouldAnimate = !prefersReduceMotion && isDesktop;

  const logoContent = (
    <motion.div 
      className={`flex items-center gap-2 ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center text-white font-black shadow-2xl overflow-hidden group border-2 border-white/30 backdrop-blur-sm`}
        style={{ 
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(135deg, #FF8C00 0%, #EC4899 50%, #A855F7 100%)',
          filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.5)) drop-shadow(0 0 20px rgba(255, 140, 0, 0.3))'
        }}
        whileHover={shouldAnimate ? { rotateY: 15, rotateX: 5 } : undefined}
        animate={shouldAnimate ? {
          boxShadow: [
            '0 10px 30px rgba(255, 140, 0, 0.5), 0 0 0 3px rgba(255, 255, 255, 0.2)',
            '0 10px 40px rgba(236, 72, 153, 0.7), 0 0 0 3px rgba(255, 255, 255, 0.3)',
            '0 10px 30px rgba(255, 140, 0, 0.5), 0 0 0 3px rgba(255, 255, 255, 0.2)',
          ],
        } : undefined}
        transition={shouldAnimate ? {
          boxShadow: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        } : undefined}
      >
        {/* Animated Background Gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-orange-400 via-pink-400 to-purple-400"
          animate={shouldAnimate ? { rotate: [0, 360] } : undefined}
          transition={shouldAnimate ? { duration: 20, repeat: Infinity, ease: 'linear' } : undefined}
        />
        
        {/* Glow Effect */}
        <motion.div
          className="absolute inset-0 bg-white/20 blur-xl"
          animate={shouldAnimate ? { opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] } : undefined}
          transition={shouldAnimate ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
        />
        
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/20 z-[5]" />
        
        {/* Logo Image or Letter */}
        <motion.img 
          src="/logo.png" 
          alt="نظام إبراهيم للمحاسبة" 
          className={`${sizeClasses[size]} object-contain flex-shrink-0 relative z-10 brightness-110 contrast-125`}
          style={{ 
            maxWidth: '100%', 
            height: 'auto', 
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            const fallback = e.target.parentElement?.querySelector('.logo-fallback');
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <motion.div 
          className="logo-fallback relative z-10 text-xl font-black hidden items-center justify-center"
          style={{ display: 'none' }}
        >
          <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]">I</span>
        </motion.div>
      </motion.div>
      
      {showText && (
        <motion.div 
          className="flex flex-col"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.span 
            className={`${textSizes[size]} font-black bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent leading-tight`}
            animate={shouldAnimate ? { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] } : undefined}
            transition={shouldAnimate ? { duration: 5, repeat: Infinity, ease: 'linear' } : undefined}
            style={{
              backgroundSize: '200% 200%',
            }}
          >
            إبراهيم
          </motion.span>
          {size !== 'sm' && (
            <motion.span 
              className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              نظام المحاسبة
            </motion.span>
          )}
        </motion.div>
      )}
    </motion.div>
  );

  if (noLink) {
    return logoContent;
  }

  return (
    <Link to="/" className="inline-block">
      {logoContent}
    </Link>
  );
};

export default Logo;
