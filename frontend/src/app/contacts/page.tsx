'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { contactsApi } from '@/lib/api';
import { Contact, ContactFormData } from '@/types';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CloudArrowUpIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await contactsApi.getContacts({
        search: searchTerm || undefined,
      });
      
      if (response.success && response.data) {
        setContacts(response.data.contacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [searchTerm]);

  const onSubmit = async (data: ContactFormData) => {
    try {
      if (editingContact) {
        // Update existing contact
        const response = await contactsApi.updateContact(editingContact._id, data);
        if (response.success) {
          toast.success('Contact updated successfully!');
          setEditingContact(null);
          fetchContacts();
          reset();
        }
      } else {
        // Add new contact
        const response = await contactsApi.addContact(data);
        if (response.success) {
          toast.success('Contact added successfully!');
          setShowAddForm(false);
          fetchContacts();
          reset();
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save contact';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const response = await contactsApi.deleteContact(id);
      if (response.success) {
        toast.success('Contact deleted successfully!');
        fetchContacts();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete contact';
      toast.error(message);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    reset({
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
    });
    setShowAddForm(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadLoading(true);
      const response = await contactsApi.uploadContacts(file);
      if (response.success) {
        toast.success(`Successfully uploaded ${response.data?.successCount || 0} contacts!`);
        fetchContacts();
      } else {
        toast.error('Failed to upload contacts');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to upload contacts';
      toast.error(message);
    } finally {
      setUploadLoading(false);
      event.target.value = '';
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm) ||
    (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <DashboardLayout title="Contacts" subtitle="Manage your contact list">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

          </div>

          <div className="flex gap-2">
            {/* File Upload */}
            <label className="btn btn-secondary btn-sm cursor-pointer">
              <CloudArrowUpIcon className="h-4 w-4 mr-1" />
              Upload Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={uploadLoading}
                className="hidden"
              />
            </label>

            {/* Add Contact */}
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingContact(null);
                reset();
              }}
              className="btn btn-primary btn-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Contact
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      {...register('name', { required: 'Name is required' })}
                      type="text"
                      className={`input ${errors.name ? 'input-error' : ''}`}
                      placeholder="Contact name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      {...register('phone', { required: 'Phone is required' })}
                      type="tel"
                      className={`input ${errors.phone ? 'input-error' : ''}`}
                      placeholder="Phone number"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className="input"
                      placeholder="Email address"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary">
                    {editingContact ? 'Update Contact' : 'Add Contact'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingContact(null);
                      reset();
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contacts List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">
              Contacts ({filteredContacts.length})
            </h3>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="loading-spinner"></div>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No contacts found</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn btn-primary mt-4"
                >
                  Add your first contact
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredContacts.map((contact) => (
                      <tr key={contact._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {contact.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{contact.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {contact.email || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(contact)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(contact._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
