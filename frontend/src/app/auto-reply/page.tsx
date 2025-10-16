'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { autoReplyApi } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ClientOnly } from '@/components/common/ClientOnly';
import { useHydration } from '@/hooks/useHydration';
import dynamic from 'next/dynamic';

interface AutoReply {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerKeywords: string[];
  responseTemplate: string;
  responseType: 'text' | 'template' | 'ai_generated';
  category: string;
  priority: number;
  statistics: {
    totalTriggers: number;
    successfulReplies: number;
    failedReplies: number;
    lastTriggered?: string;
  };
  createdAt: string;
}

interface ReplyData {
  _id: string;
  name: string;
  description?: string;
  category: string;
  dataType: 'excel_import' | 'manual_entry' | 'api_import';
  data: Array<{
    key: string;
    value: string;
    context?: string;
    tags?: string[];
    priority?: number;
  }>;
  isActive: boolean;
  importMetadata?: {
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    importDate: string;
  };
  statistics: {
    totalQueries: number;
    successfulMatches: number;
    lastUsed?: string;
  };
  createdAt: string;
}

// Create a client-only component to prevent hydration issues
const AutoReplyContent: React.FC = () => {
  const { user } = useAuthStore();
  const isHydrated = useHydration();
  const [activeTab, setActiveTab] = useState<'auto-replies' | 'data' | 'logs'>('auto-replies');
  const [autoReplies, setAutoReplies] = useState<AutoReply[]>([]);
  const [replyData, setReplyData] = useState<ReplyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Simple auto-reply settings
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplySettings, setAutoReplySettings] = useState({
    personality: 'professional',
    includeGreeting: true,
    includeClosing: true,
    useRAG: true
  });

  // Manual data form state
  const [manualDataForm, setManualDataForm] = useState({
    name: '',
    description: '',
    category: 'general',
    dataType: 'manual_entry',
    data: ''
  });

  useEffect(() => {
    if (user && isHydrated) {
      loadAutoReplies();
      loadReplyData();
      loadAutoReplySettings();
    }
  }, [user, isHydrated]);

  // Auto-save settings when they change
  useEffect(() => {
    if (isHydrated && user) {
      const timeoutId = setTimeout(() => {
        saveAutoReplySettings();
      }, 1000); // Auto-save after 1 second of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [autoReplyEnabled, autoReplySettings]);

  const loadAutoReplies = async () => {
    try {
      const response = await autoReplyApi.getAutoReplies();
      if (response.success && response.data) {
        setAutoReplies(response.data.autoReplies);
      }
    } catch (error) {
      console.error('Error loading auto-replies:', error);
    }
  };

  const loadReplyData = async () => {
    try {
      const response = await autoReplyApi.getReplyData();
      if (response.success && response.data) {
        setReplyData(response.data.replyData);
      }
    } catch (error) {
      console.error('Error loading reply data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAutoReplySettings = async () => {
    try {
      const response = await autoReplyApi.getAutoReplies();
      if (response.success && response.data) {
        const aiAutoReply = response.data.autoReplies.find(ar => ar.responseType === 'ai_generated');
        if (aiAutoReply) {
          setAutoReplyEnabled(aiAutoReply.isActive);
          if (aiAutoReply.aiSettings) {
            setAutoReplySettings({
              personality: aiAutoReply.aiSettings.personality || 'professional',
              includeGreeting: aiAutoReply.aiSettings.includeGreeting || true,
              includeClosing: aiAutoReply.aiSettings.includeClosing || true,
              useRAG: aiAutoReply.aiSettings.useRAG || true
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading auto-reply settings:', error);
    }
  };

  const toggleAutoReply = async (id: string) => {
    try {
      const response = await autoReplyApi.toggleAutoReply(id);
      if (response.success) {
        loadAutoReplies();
      }
    } catch (error) {
      console.error('Error toggling auto-reply:', error);
    }
  };

  const deleteAutoReply = async (id: string) => {
    if (!confirm('Are you sure you want to delete this auto-reply?')) return;
    
    try {
      const response = await autoReplyApi.deleteAutoReply(id);
      if (response.success) {
        loadAutoReplies();
      }
    } catch (error) {
      console.error('Error deleting auto-reply:', error);
    }
  };

  const deleteReplyData = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reply data?')) return;
    
    try {
      const response = await autoReplyApi.deleteReplyData(id);
      if (response.success) {
        loadReplyData();
      }
    } catch (error) {
      console.error('Error deleting reply data:', error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      const response = await autoReplyApi.uploadReplyData(selectedFile, {
        name: `Imported Data ${new Date().toISOString()}`,
        category: 'general'
      });
      
      if (response.success) {
        setShowUploadModal(false);
        setSelectedFile(null);
        loadReplyData();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const saveAutoReplySettings = async () => {
    try {
      // Create a simple AI auto-reply rule
      const autoReplyData = {
        name: 'AI Auto-Reply',
        description: 'Intelligent AI-powered auto-reply',
        category: 'general',
        responseType: 'ai_generated',
        triggerKeywords: [], // No specific keywords - AI handles all messages
        responseTemplate: 'AI will generate response based on incoming message', // Placeholder for AI responses
        priority: 1,
        isActive: autoReplyEnabled,
        aiSettings: {
          useAI: true,
          personality: autoReplySettings.personality,
          includeGreeting: autoReplySettings.includeGreeting,
          includeClosing: autoReplySettings.includeClosing,
          useRAG: autoReplySettings.useRAG
        },
        statistics: {
          totalTriggers: 0,
          successfulReplies: 0,
          failedReplies: 0,
          lastTriggered: null
        }
      };

      // Update or create the AI auto-reply rule
      const response = await autoReplyApi.createAutoReply(autoReplyData);
      if (response.success) {
        console.log('AI Auto-reply settings saved successfully');
        loadAutoReplies();
      }
    } catch (error) {
      console.error('Error saving auto-reply settings:', error);
    }
  };

  const handleManualDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse the manual data (expecting Q&A format)
      const dataLines = manualDataForm.data.split('\n').filter(line => line.trim());
      const parsedData = [];
      
      for (let i = 0; i < dataLines.length; i += 2) {
        if (i + 1 < dataLines.length) {
          parsedData.push({
            key: dataLines[i].trim(),
            value: dataLines[i + 1].trim(),
            context: '',
            tags: [],
            priority: 1
          });
        }
      }

      const replyData = {
        ...manualDataForm,
        data: parsedData,
        isActive: true,
        statistics: {
          totalQueries: 0,
          successfulMatches: 0,
          lastAccessed: null
        }
      };

      const response = await autoReplyApi.createReplyData(replyData);
      if (response.success) {
        console.log('Manual data created successfully');
        loadReplyData();
        setShowDataModal(false);
        setManualDataForm({
          name: '',
          description: '',
          category: 'general',
          dataType: 'manual_entry',
          data: ''
        });
      }
    } catch (error) {
      console.error('Error creating manual data:', error);
    }
  };

  if (!isHydrated || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('auto-replies')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'auto-replies'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Auto-Replies
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reply Data
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Logs
            </button>
          </nav>
        </div>

        {/* Auto-Replies Tab */}
        {activeTab === 'auto-replies' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">AI Auto-Reply Settings</h2>
              
              {/* Simple Auto-Reply Toggle */}
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Enable AI Auto-Reply</h3>
                    <p className="text-gray-600 mt-1">
                      Automatically reply to incoming WhatsApp messages using AI
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoReplyEnabled}
                      onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                {autoReplyEnabled && (
                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          AI Personality
                        </label>
                        <select
                          value={autoReplySettings.personality}
                          onChange={(e) => setAutoReplySettings({...autoReplySettings, personality: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="professional">Professional</option>
                          <option value="friendly">Friendly</option>
                          <option value="casual">Casual</option>
                          <option value="formal">Formal</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={autoReplySettings.includeGreeting}
                            onChange={(e) => setAutoReplySettings({...autoReplySettings, includeGreeting: e.target.checked})}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Include Greeting</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={autoReplySettings.includeClosing}
                            onChange={(e) => setAutoReplySettings({...autoReplySettings, includeClosing: e.target.checked})}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Include Closing</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoReplySettings.useRAG}
                        onChange={(e) => setAutoReplySettings({...autoReplySettings, useRAG: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Use uploaded data for context (RAG)
                      </span>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• AI analyzes incoming messages and generates intelligent responses</li>
                        <li>• Uses uploaded data (if available) for better context</li>
                        <li>• Automatically adapts to different conversation types</li>
                        <li>• No need to set up complex rules or templates</li>
                      </ul>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={saveAutoReplySettings}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Save Settings
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reply Data Tab */}
        {activeTab === 'data' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Reply Data Sources</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDataModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Add Manual Data
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Upload Excel
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {replyData.map((data) => (
                <div key={data._id} className="bg-white p-6 rounded-lg shadow border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{data.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          data.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {data.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          {data.dataType}
                        </span>
                      </div>
                      
                      {data.description && (
                        <p className="text-gray-600 mb-3">{data.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-500">Data Entries</p>
                          <p className="text-sm font-medium">{data.data.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Category</p>
                          <p className="text-sm font-medium">{data.category}</p>
                        </div>
                      </div>
                      
                      {data.importMetadata && (
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-500">Imported Rows</p>
                            <p className="text-sm font-medium">{data.importMetadata.importedRows}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Skipped Rows</p>
                            <p className="text-sm font-medium">{data.importMetadata.skippedRows}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Import Date</p>
                            <p className="text-sm font-medium">
                              {new Date(data.importMetadata.importDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Total Queries</p>
                          <p className="text-sm font-medium">{data.statistics.totalQueries}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Match Rate</p>
                          <p className="text-sm font-medium">
                            {data.statistics.totalQueries > 0 
                              ? `${Math.round((data.statistics.successfulMatches / data.statistics.totalQueries) * 100)}%`
                              : '0%'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteReplyData(data._id)}
                        className="px-3 py-1 rounded text-sm bg-red-100 text-red-800 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {replyData.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No reply data sources configured yet.</p>
                  <div className="mt-4 flex gap-2 justify-center">
                    <button
                      onClick={() => setShowDataModal(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Add Manual Data
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Upload Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Auto-Reply Logs</h2>
            <div className="bg-white p-6 rounded-lg shadow border">
              <p className="text-gray-500">Logs will be displayed here once auto-replies are active.</p>
            </div>
          </div>
        )}

        {/* Manual Data Modal */}
        {showDataModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add Manual Data</h3>
              <form onSubmit={handleManualDataSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={manualDataForm.name}
                    onChange={(e) => setManualDataForm({...manualDataForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter data source name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={manualDataForm.description}
                    onChange={(e) => setManualDataForm({...manualDataForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={manualDataForm.category}
                      onChange={(e) => setManualDataForm({...manualDataForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="support">Support</option>
                      <option value="sales">Sales</option>
                      <option value="billing">Billing</option>
                      <option value="spa_salon">Spa & Salon</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Type
                    </label>
                    <select
                      value={manualDataForm.dataType}
                      onChange={(e) => setManualDataForm({...manualDataForm, dataType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="manual">Manual Entry</option>
                      <option value="faq">FAQ</option>
                      <option value="knowledge">Knowledge Base</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Q&A Data (One question per line, followed by answer)
                  </label>
                  <textarea
                    value={manualDataForm.data}
                    onChange={(e) => setManualDataForm({...manualDataForm, data: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={8}
                    placeholder="Question 1&#10;Answer 1&#10;Question 2&#10;Answer 2&#10;..."
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Format: One question per line, followed by its answer on the next line
                  </p>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDataModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upload Excel Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Upload Excel File</h3>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Excel File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: .xlsx, .xls, .csv (Max 10MB)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter name for this data set"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="general">General</option>
                    <option value="support">Support</option>
                    <option value="sales">Sales</option>
                    <option value="billing">Billing</option>
                    <option value="spa_salon">Spa & Salon</option>
                  </select>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Excel Format:</strong> Your Excel file should have columns for questions/triggers and answers/responses. 
                    The system will automatically detect columns like "Question", "Answer", "Key", "Value", etc.
                  </p>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Upload File
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

// Main page component with dynamic import to prevent hydration issues
const AutoReplyPage: React.FC = () => {
  return (
    <DashboardLayout title="Auto-Reply System" subtitle="Manage intelligent auto-replies and data sources">
      <ClientOnly fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <AutoReplyContent />
      </ClientOnly>
    </DashboardLayout>
  );
};

// Export with dynamic import to prevent SSR hydration issues
export default dynamic(() => Promise.resolve(AutoReplyPage), {
  ssr: false,
  loading: () => (
    <DashboardLayout title="Auto-Reply System" subtitle="Loading...">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    </DashboardLayout>
  )
});
