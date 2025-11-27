
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, User, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { formatDateAR, getRelativeTimeAR } from '@/lib/dateUtils';

const ActiveUsersCard = ({ t }) => {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveUsers();
    // Update every 30 seconds
    const interval = setInterval(loadActiveUsers, 30000);
    return () => clearInterval(interval);
  }, [user?.tenant_id]);

  const loadActiveUsers = async () => {
    if (!user?.tenant_id) return;
    
    try {
      setLoading(true);
      // Get all users for tenant
      // Use the new getActiveUsers function if available
      const activeUsersList = await neonService.getActiveUsers?.(user.tenant_id, 5) || [];
      
      if (activeUsersList.length > 0) {
        setActiveUsers(activeUsersList);
        setLoading(false);
        return;
      }
      
      // Fallback to old method
      const allUsers = await neonService.getUsers(user.tenant_id);
      
      // Filter active users (online in last 5 minutes)
      const now = new Date();
      const filteredActiveUsers = allUsers
        .filter(u => {
          if (!u.is_active) return false;
          
          // Check if user has last_login or last_seen
          const lastSeen = u.last_seen ? new Date(u.last_seen) : (u.last_login ? new Date(u.last_login) : null);
          if (!lastSeen) return false;
          
          // Consider active if seen in last 5 minutes
          const minutesSinceSeen = (now - lastSeen) / (1000 * 60);
          return minutesSinceSeen <= 5;
        })
        .map(u => ({
          ...u,
          lastSeen: u.last_seen || u.last_login,
          isOnline: true
        }))
        .sort((a, b) => {
          const aTime = new Date(a.lastSeen || 0);
          const bTime = new Date(b.lastSeen || 0);
          return bTime - aTime;
        });
      
      setActiveUsers(filteredActiveUsers);
    } catch (error) {
      console.error('Load active users error:', error);
      setActiveUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = activeUsers.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group relative overflow-hidden bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
      }}
    >
      {/* Animated Background - matching dashboard style */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-pink-500/0 to-purple-500/0"
        animate={{
          background: [
            'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
            'linear-gradient(135deg, rgba(255, 140, 0, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
            'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Users className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('dashboard.activeEmployees') || 'المستخدمون النشطون'}
              </h3>
              <motion.p
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-3xl font-black text-gray-900 dark:text-white mt-1"
              >
                {loading ? '...' : activeCount}
              </motion.p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Eye className="h-5 w-5 text-gray-400" />
          </motion.button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 max-h-64 overflow-y-auto">
                {activeUsers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">لا يوجد مستخدمون نشطون حالياً</p>
                  </div>
                ) : (
                  activeUsers.map((activeUser, index) => (
                    <motion.div
                      key={activeUser.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {activeUser.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activeUser.role || 'مستخدم'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right rtl:text-left">
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Clock className="h-3 w-3" />
                          <span>نشط الآن</span>
                        </div>
                        {activeUser.lastSeen && (
                          <p className="text-xs text-gray-400 mt-1">
                            {getRelativeTimeAR(activeUser.lastSeen)}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isExpanded && activeUsers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              {activeUsers.slice(0, 3).map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-gray-800"></div>
                </motion.div>
              ))}
              {activeUsers.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                  +{activeUsers.length - 3}
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 rtl:mr-auto ltr:ml-auto">
                انقر لعرض التفاصيل
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ActiveUsersCard;

