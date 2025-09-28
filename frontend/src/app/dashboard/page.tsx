'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { useWhatsAppStore } from '@/store/whatsappStore';
import { useSettingsStore } from '@/store/settingsStore';
import { messagesApi } from '@/lib/api';
import { Statistics } from '@/types';
import { WhatsAppConnectionComponent } from '@/components/whatsapp/WhatsAppConnection';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { isConnected } = useWhatsAppStore();
  const { settings } = useSettingsStore();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      window.location.href = '/auth/login';
    }
  }, [user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const statsResponse = await messagesApi.getStatistics('7'); // Last 7 days

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        } else {
          console.error('Failed to fetch statistics:', statsResponse.message);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set default stats to prevent UI errors
        setStats({
          period: '7 days',
          messageStats: [],
          bulkMessageStats: [],
          totalContacts: 0
        });
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user is authenticated
    if (user) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const getStatValue = useCallback((stats: any[], status: string) => {
    const stat = stats.find(s => s._id === status);
    return stat ? stat.count : 0;
  }, []);

  const totalMessages = useMemo(() => {
    if (!stats) return 0;
    return getStatValue(stats.messageStats, 'sent') + 
           getStatValue(stats.messageStats, 'delivered') + 
           getStatValue(stats.messageStats, 'read');
  }, [stats, getStatValue]);

  const successfulMessages = useMemo(() => {
    if (!stats) return 0;
    return getStatValue(stats.messageStats, 'sent') + 
           getStatValue(stats.messageStats, 'delivered') + 
           getStatValue(stats.messageStats, 'read');
  }, [stats, getStatValue]);

  const failedMessages = useMemo(() => {
    return stats ? getStatValue(stats.messageStats, 'failed') : 0;
  }, [stats, getStatValue]);

  const successRate = useMemo(() => {
    return totalMessages > 0 ? (successfulMessages / totalMessages) * 100 : 0;
  }, [totalMessages, successfulMessages]);

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome to WhatsApp Bulk Messenger">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle={`Welcome back, ${user?.name}`}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Contacts
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.totalContacts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Messages Sent
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalMessages}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Success Rate
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {successRate.toFixed(1)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Failed Messages
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {failedMessages}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Connection Status */}
        <WhatsAppConnectionComponent />

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Quick Actions
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button 
                className={`btn ${isConnected ? 'btn-primary' : 'btn-secondary'}`}
                disabled={!isConnected}
                title={!isConnected ? 'Connect WhatsApp first' : 'Send bulk messages'}
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                Send Bulk Message
                {!isConnected && (
                  <span className="ml-2 text-xs">(Requires WhatsApp)</span>
                )}
              </button>
              <button className="btn btn-secondary">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Add Contacts
              </button>
              <button className="btn btn-secondary">
                <ArrowUpIcon className="h-5 w-5 mr-2" />
                Upload Excel
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Activity (Last 7 Days)
            </h3>
          </div>
          <div className="card-body">
            {stats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-900">Total Messages</span>
                  <span className="text-sm text-gray-500">{totalMessages}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-900">Successful</span>
                  <span className="text-sm text-green-600">{successfulMessages}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-900">Failed</span>
                  <span className="text-sm text-red-600">{failedMessages}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-900">Success Rate</span>
                  <span className="text-sm text-gray-500">{successRate.toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No activity data available</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
