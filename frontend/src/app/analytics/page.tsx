'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { messagesApi, contactsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  pendingMessages: number;
  totalContacts: number;
  activeCampaigns: number;
  successRate: number;
  averageResponseTime: number;
  messagesByDay: Array<{ date: string; count: number }>;
  messagesByStatus: Array<{ status: string; count: number }>;
  topContacts: Array<{ name: string; phone: string; messageCount: number }>;
  recentActivity: Array<{ type: string; message: string; timestamp: string }>;
}

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Fetch contacts
      const contactsResponse = await contactsApi.getContacts({ limit: 1000 });
      const totalContacts = contactsResponse.success ? contactsResponse.data?.contacts.length || 0 : 0;

      // Fetch bulk messages
      const messagesResponse = await messagesApi.getBulkMessages({ limit: 100 });
      const bulkMessages = messagesResponse.success ? messagesResponse.data?.bulkMessages || [] : [];

      // Calculate analytics
      const totalMessages = bulkMessages.reduce((sum, bm) => sum + (bm.totalContacts || 0), 0);
      const sentMessages = bulkMessages.reduce((sum, bm) => sum + (bm.progress?.sent || 0), 0);
      const failedMessages = bulkMessages.reduce((sum, bm) => sum + (bm.progress?.failed || 0), 0);
      const pendingMessages = bulkMessages.reduce((sum, bm) => sum + (bm.progress?.pending || 0), 0);
      const activeCampaigns = bulkMessages.filter(bm => bm.status === 'processing').length;
      const successRate = totalMessages > 0 ? (sentMessages / totalMessages) * 100 : 0;

      // Generate sample data for charts (replace with real data)
      const messagesByDay = generateSampleData('day', 7);
      const messagesByStatus = [
        { status: 'Sent', count: sentMessages },
        { status: 'Failed', count: failedMessages },
        { status: 'Pending', count: pendingMessages },
      ];

      const topContacts = generateTopContacts(contactsResponse.data?.contacts || []);
      const recentActivity = generateRecentActivity(bulkMessages);

      setAnalyticsData({
        totalMessages,
        sentMessages,
        failedMessages,
        pendingMessages,
        totalContacts,
        activeCampaigns,
        successRate,
        averageResponseTime: 2.5, // Sample data
        messagesByDay,
        messagesByStatus,
        topContacts,
        recentActivity,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleData = (type: string, days: number) => {
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 50) + 10,
      });
    }
    return data;
  };

  const generateTopContacts = (contacts: any[]) => {
    return contacts.slice(0, 5).map(contact => ({
      name: contact.name || 'Unknown',
      phone: contact.phone,
      messageCount: Math.floor(Math.random() * 20) + 1,
    }));
  };

  const generateRecentActivity = (bulkMessages: any[]) => {
    return bulkMessages.slice(0, 5).map(bm => ({
      type: 'campaign',
      message: `Campaign "${bm.message?.substring(0, 30)}..." ${bm.status}`,
      timestamp: new Date(bm.createdAt).toLocaleString(),
    }));
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Analytics" subtitle="Performance metrics and insights">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout title="Analytics" subtitle="Performance metrics and insights">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">Start sending messages to see analytics data.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics" subtitle="Performance metrics and insights">
      <div className="space-y-6">
        {/* Date Range Selector */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Messages</p>
                  <p className="text-2xl font-semibold text-gray-900">{analyticsData.totalMessages}</p>
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
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Sent Messages</p>
                  <p className="text-2xl font-semibold text-gray-900">{analyticsData.sentMessages}</p>
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
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Failed Messages</p>
                  <p className="text-2xl font-semibold text-gray-900">{analyticsData.failedMessages}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{analyticsData.successRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages Over Time */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Messages Over Time</h3>
            </div>
            <div className="card-body">
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Chart visualization would go here</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {analyticsData.messagesByDay.length} data points available
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Message Status Distribution */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Message Status</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {analyticsData.messagesByStatus.map((status, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        status.status === 'Sent' ? 'bg-green-500' :
                        status.status === 'Failed' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-900">{status.status}</span>
                    </div>
                    <span className="text-sm text-gray-500">{status.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-blue-600 mr-4" />
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{analyticsData.totalContacts}</p>
                  <p className="text-sm text-gray-500">Total contacts</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Active Campaigns</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-orange-600 mr-4" />
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{analyticsData.activeCampaigns}</p>
                  <p className="text-sm text-gray-500">Currently processing</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Response Time</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center">
                <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600 mr-4" />
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{analyticsData.averageResponseTime}s</p>
                  <p className="text-sm text-gray-500">Average response time</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {analyticsData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
