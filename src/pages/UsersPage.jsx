
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { storage } from '@/lib/storage';
import UserDialog from '@/components/users/UserDialog';
import UserTable from '@/components/users/UserTable';

const UsersPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    setUsers(storage.get('users', user.tenant_id));
  };

  const handleSave = (data) => {
    if (selectedUser) {
      storage.update('users', selectedUser.id, data);
      toast({ title: 'User updated successfully' });
    } else {
      const newItem = { 
          ...data, 
          tenant_id: user.tenant_id,
          locale: 'en',
          is_active: true,
          created_at: new Date().toISOString()
      };
      storage.add('users', newItem);
      toast({ title: 'User added successfully' });
    }
    loadData();
    setDialogOpen(false);
  };

  const handleDelete = (id) => {
    if (id === user.id) {
        toast({ title: 'Cannot delete yourself', variant: 'destructive' });
        return;
    }
    if (window.confirm('Delete this user?')) {
      storage.delete('users', id);
      toast({ title: 'User deleted' });
      loadData();
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('nav.users')} - Ibrahim Accounting System</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {t('nav.users')}
            </h1>
          </div>
          <Button onClick={() => { setSelectedUser(null); setDialogOpen(true); }} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            <Plus className="h-4 w-4 mr-2" /> {t('common.add')}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <UserTable users={users} onEdit={(u) => { setSelectedUser(u); setDialogOpen(true); }} onDelete={handleDelete} />
        </div>

        <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} user={selectedUser} onSave={handleSave} />
      </div>
    </>
  );
};

export default UsersPage;
