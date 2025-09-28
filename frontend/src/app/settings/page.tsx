'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { useWhatsAppStore } from '@/store/whatsappStore';
import { useSettingsStore } from '@/store/settingsStore';
import { whatsappApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  UserIcon,
  KeyIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { isConnected } = useWhatsAppStore();
  const {
    settings,
    isLoading,
    isSaving,
    updateMessageSettings,
    updateAISettings,
    updateWhatsAppSettings,
    updateNotificationSettings,
    updateRegionalSettings,
    updatePerformanceSettings,
    updateSecuritySettings,
    updateUISettings,
    resetSettings,
    loadSettings,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleMessageSettingsChange = (field: string, value: any) => {
    updateMessageSettings({ [field]: value });
    toast.success('Message settings updated');
  };

  const handleAISettingsChange = (field: string, value: any) => {
    updateAISettings({ [field]: value });
    toast.success('AI settings updated');
  };

  const handleWhatsAppSettingsChange = (field: string, value: any) => {
    updateWhatsAppSettings({ [field]: value });
    toast.success('WhatsApp settings updated');
  };

  const handleNotificationSettingsChange = (field: string, value: any) => {
    updateNotificationSettings({ [field]: value });
    toast.success('Notification settings updated');
  };

  const handleRegionalSettingsChange = (field: string, value: any) => {
    updateRegionalSettings({ [field]: value });
    toast.success('Regional settings updated');
  };

  const handlePerformanceSettingsChange = (field: string, value: any) => {
    updatePerformanceSettings({ [field]: value });
    toast.success('Performance settings updated');
  };

  const handleSecuritySettingsChange = (field: string, value: any) => {
    updateSecuritySettings({ [field]: value });
    toast.success('Security settings updated');
  };

  const handleUISettingsChange = (field: string, value: any) => {
    updateUISettings({ [field]: value });
    toast.success('UI settings updated');
  };

  const handleResetSettings = async () => {
    if (confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      await resetSettings();
      toast.success('Settings reset to defaults');
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'messages', name: 'Messages', icon: ChatBubbleLeftRightIcon },
    { id: 'ai', name: 'AI Settings', icon: SparklesIcon },
    { id: 'whatsapp', name: 'WhatsApp', icon: DevicePhoneMobileIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'regional', name: 'Regional', icon: GlobeAltIcon },
    { id: 'performance', name: 'Performance', icon: ChartBarIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'ui', name: 'Interface', icon: CogIcon },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Settings" subtitle="Manage your application preferences">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings" subtitle="Manage your application preferences">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Information</h3>
                  <p className="mt-1 text-sm text-gray-500">Update your personal information</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      defaultValue={user?.name || ''}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      defaultValue={user?.email || ''}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      disabled
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Message Settings */}
            {activeTab === 'messages' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Message Settings</h3>
                  <p className="mt-1 text-sm text-gray-500">Configure how messages are sent</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Message Delay (seconds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={settings.messageDelay}
                      onChange={(e) => handleMessageSettingsChange('messageDelay', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Delay between sending messages</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Max Retries
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.maxRetries}
                      onChange={(e) => handleMessageSettingsChange('maxRetries', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Maximum retry attempts for failed messages</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoRetry}
                    onChange={(e) => handleMessageSettingsChange('autoRetry', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Automatically retry failed messages
                  </label>
                </div>
              </div>
            )}

            {/* AI Settings */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">AI Settings</h3>
                  <p className="mt-1 text-sm text-gray-500">Configure AI-powered features</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.aiEnabled}
                      onChange={(e) => handleAISettingsChange('aiEnabled', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Enable AI Analysis
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.spamDetection}
                      onChange={(e) => handleAISettingsChange('spamDetection', e.target.checked)}
                      disabled={!settings.aiEnabled}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Spam Detection
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.messageRewriting}
                      onChange={(e) => handleAISettingsChange('messageRewriting', e.target.checked)}
                      disabled={!settings.aiEnabled}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Message Rewriting
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">AI Model</label>
                    <select
                      value={settings.aiModel}
                      onChange={(e) => handleAISettingsChange('aiModel', e.target.value)}
                      disabled={!settings.aiEnabled}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-50"
                    >
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
                      <option value="gpt-4">GPT-4 (More Accurate)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Settings */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">WhatsApp Settings</h3>
                  <p className="mt-1 text-sm text-gray-500">Configure WhatsApp connection settings</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Connection Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="300"
                      value={settings.whatsappTimeout}
                      onChange={(e) => handleWhatsAppSettingsChange('whatsappTimeout', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      QR Refresh Interval (seconds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.qrRefreshInterval}
                      onChange={(e) => handleWhatsAppSettingsChange('qrRefreshInterval', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoReconnect}
                    onChange={(e) => handleWhatsAppSettingsChange('autoReconnect', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Automatically reconnect on disconnect
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        WhatsApp Status: {isConnected ? 'Connected' : 'Not Connected'}
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>Current settings will be applied to new connections.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Notification Settings</h3>
                  <p className="mt-1 text-sm text-gray-500">Configure how you receive notifications</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleNotificationSettingsChange('emailNotifications', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Email Notifications
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.pushNotifications}
                      onChange={(e) => handleNotificationSettingsChange('pushNotifications', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Push Notifications
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.soundNotifications}
                      onChange={(e) => handleNotificationSettingsChange('soundNotifications', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Sound Notifications
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Notification Types</h4>
                    <div className="space-y-2">
                      {Object.entries(settings.notificationTypes).map(([key, value]) => (
                        <div key={key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleNotificationSettingsChange('notificationTypes', {
                              ...settings.notificationTypes,
                              [key]: e.target.checked
                            })}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 block text-sm text-gray-900 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Regional Settings */}
            {activeTab === 'regional' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Regional Settings</h3>
                  <p className="mt-1 text-sm text-gray-500">Configure your regional preferences</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleRegionalSettingsChange('timezone', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (India)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date Format</label>
                    <select
                      value={settings.dateFormat}
                      onChange={(e) => handleRegionalSettingsChange('dateFormat', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time Format</label>
                    <select
                      value={settings.timeFormat}
                      onChange={(e) => handleRegionalSettingsChange('timeFormat', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="12h">12 Hour (AM/PM)</option>
                      <option value="24h">24 Hour</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <select
                      value={settings.currency}
                      onChange={(e) => handleRegionalSettingsChange('currency', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Settings */}
            {activeTab === 'performance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Performance Settings</h3>
                  <p className="mt-1 text-sm text-gray-500">Optimize application performance</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Batch Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.batchSize}
                      onChange={(e) => handlePerformanceSettingsChange('batchSize', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Messages processed in one batch</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Concurrent Connections
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={settings.concurrentConnections}
                      onChange={(e) => handlePerformanceSettingsChange('concurrentConnections', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Maximum concurrent connections</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cache Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={settings.cacheDuration}
                      onChange={(e) => handlePerformanceSettingsChange('cacheDuration', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">How long to cache data</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.cacheEnabled}
                    onChange={(e) => handlePerformanceSettingsChange('cacheEnabled', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Enable caching for better performance
                  </label>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Security Settings</h3>
                  <p className="mt-1 text-sm text-gray-500">Configure security preferences</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="480"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleSecuritySettingsChange('sessionTimeout', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={settings.loginAttempts}
                      onChange={(e) => handleSecuritySettingsChange('loginAttempts', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.requirePasswordChange}
                      onChange={(e) => handleSecuritySettingsChange('requirePasswordChange', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Require password change on next login
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.twoFactorAuth}
                      onChange={(e) => handleSecuritySettingsChange('twoFactorAuth', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Enable Two-Factor Authentication
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* UI Settings */}
            {activeTab === 'ui' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Interface Settings</h3>
                  <p className="mt-1 text-sm text-gray-500">Customize your user interface</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Theme</label>
                    <select
                      value={settings.theme}
                      onChange={(e) => handleUISettingsChange('theme', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Language</label>
                    <select
                      value={settings.language}
                      onChange={(e) => handleUISettingsChange('language', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.sidebarCollapsed}
                      onChange={(e) => handleUISettingsChange('sidebarCollapsed', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Collapse sidebar by default
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.animationsEnabled}
                      onChange={(e) => handleUISettingsChange('animationsEnabled', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Enable animations
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.compactMode}
                      onChange={(e) => handleUISettingsChange('compactMode', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Compact mode
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
            <button
              onClick={handleResetSettings}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Reset to Defaults
            </button>

            <div className="flex items-center text-sm text-gray-500">
              {isSaving && (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                  Saving...
                </div>
              )}
              {!isSaving && (
                <div className="flex items-center text-green-600">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Settings saved automatically
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}