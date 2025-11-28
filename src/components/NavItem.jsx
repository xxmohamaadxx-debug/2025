import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NavItem = ({ to, icon: Icon, label, isActive, onClick, delay = 0, disableMotion = false }) => {
  if (disableMotion) {
    return (
      <div className="mb-2">
        <Link
          to={to}
          onClick={onClick}
          className={`group relative flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
            isActive
              ? 'bg-orange-500/20 text-white font-semibold'
              : 'text-gray-200 bg-white/5 hover:bg-white/10'
          }`}
        >
          <Icon
            className={`h-5 w-5 ltr:mr-3 rtl:ml-3 ${
              isActive ? 'text-orange-300' : 'text-gray-400 group-hover:text-orange-300'
            }`}
          />
          <span className="font-medium">{label}</span>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="mb-2"
    >
      <Link to={to} onClick={onClick}>
        <motion.div
          whileHover={{ 
            scale: 1.02,
            x: 5,
          }}
          whileTap={{ scale: 0.98 }}
          className={`
            group relative flex items-center px-4 py-3 rounded-xl
            transition-all duration-300 ease-out
            ${isActive
              ? 'bg-gradient-to-r from-orange-500/40 via-pink-500/30 to-purple-500/30 text-white font-semibold shadow-2xl shadow-orange-500/30'
              : 'text-gray-300 hover:text-white'
            }
          `}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Neon Glow Effect for Active */}
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 opacity-30 blur-xl"
              animate={{
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* Hover Glow Effect */}
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/0 via-pink-500/0 to-purple-500/0 opacity-0 group-hover:opacity-20 blur-lg"
            transition={{ duration: 0.3 }}
          />

          {/* Left Border Indicator */}
          <motion.div
            className="absolute rtl:right-0 ltr:left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-gradient-to-b from-orange-500 via-pink-500 to-purple-500 rounded-r-full rtl:rounded-l-full"
            animate={{
              height: isActive ? '60%' : '0%',
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Icon with Advanced 3D Rotation & Glow */}
          <motion.div
            className="relative z-10"
            whileHover={{ rotateY: 15, rotateX: 5, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full blur-md opacity-50"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
            <Icon className={`h-5 w-5 ltr:mr-3 rtl:ml-3 transition-all duration-300 relative z-10 ${
              isActive 
                ? 'text-white drop-shadow-lg' 
                : 'text-gray-400 group-hover:text-orange-400'
            } ${!isActive ? 'group-hover:scale-110' : ''}`} />
          </motion.div>

          {/* Label */}
          <span className="relative z-10 font-medium">{label}</span>

          {/* Animated Underline */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isActive ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default NavItem;

