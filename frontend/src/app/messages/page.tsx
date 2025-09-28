'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useForm } from 'react-hook-form';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { useWhatsAppStore } from '@/store/whatsappStore';
import { useSettingsStore } from '@/store/settingsStore';
import { messagesApi, contactsApi, whatsappApi } from '@/lib/api';
import { BulkMessageFormData, SpamAnalysis, Contact, MessageCategory } from '@/types';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { isConnected, connect } = useWhatsAppStore();
  const { settings } = useSettingsStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<SpamAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [bulkMessageId, setBulkMessageId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BulkMessageFormData>({
    defaultValues: {
      message: '',
      category: 'other',
      selectedContacts: [],
    },
  });

  const message = watch('message');
  const category = watch('category');

  useEffect(() => {
    fetchContacts();
  }, []);

  // Separate useEffect for WhatsApp connection check (only on mount)
  useEffect(() => {
    console.log('Messages page - WhatsApp connection status:', isConnected);
    // Remove the automatic check to prevent excessive API calls
    // The WhatsApp provider will handle status updates
  }, []); // Only run once on mount

  // Cleanup polling interval on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Optimized status polling for bulk message processing
  const startStatusPolling = (bulkMessageId: string) => {
    // Clear any existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    let pollCount = 0;
    const maxPolls = 300; // 10 minutes max (300 * 2 seconds)
    
    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setPollingInterval(null);
          setIsProcessing(false);
          setBulkMessageId(null);
          toast.error('Bulk message processing timeout');
          return;
        }
        
        const response = await messagesApi.getBulkMessageStatus(bulkMessageId);
        if (response.success && response.data) {
          const bulkMessage = response.data.bulkMessage;
          
          // Check if all messages are processed (sent + failed = total)
          const isCompleted = bulkMessage.progress && 
            (bulkMessage.progress.sent + bulkMessage.progress.failed) >= bulkMessage.totalContacts;
          
          // Update status to completed if all messages are processed
          const updatedBulkMessage = {
            ...bulkMessage,
            status: isCompleted ? 'completed' : bulkMessage.status
          };
          
          setProcessingStatus(updatedBulkMessage);
          
          // Check if processing is complete
          if (isCompleted || bulkMessage.status === 'failed') {
            clearInterval(pollInterval);
            setPollingInterval(null);
            setIsProcessing(false);
            setBulkMessageId(null);
            
            if (isCompleted) {
              toast.success('Bulk message completed successfully!');
            } else {
              toast.error('Bulk message failed to complete');
            }
          }
        }
      } catch (error) {
          console.error('Error polling bulk message status:', error);
      }
    }, 2000); // Poll every 2 seconds
    
    // Store the interval for cleanup
    setPollingInterval(pollInterval);
  };

  const fetchContacts = useCallback(async () => {
    try {
      console.log('Fetching contacts...');
      const response = await contactsApi.getContacts({ limit: 1000 });
      console.log('Contacts response:', response);
      if (response.success && response.data) {
        setContacts(response.data.contacts);
        console.log('Contacts loaded:', response.data.contacts.length);
      } else {
        console.error('Failed to fetch contacts:', response);
        toast.error('Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to fetch contacts');
    }
  }, []);

  const analyzeMessage = async (messageText: string, messageCategory: string) => {
    if (!messageText.trim()) return;

    setIsAnalyzing(true);
    try {
      const response = await messagesApi.analyzeMessage({
        message: messageText,
        category: messageCategory,
      });

      if (response.success && response.data) {
        setAnalysis(response.data);
        setShowAnalysis(true);
      }
    } catch (error) {
      console.error('Error analyzing message:', error);
      toast.error('Failed to analyze message');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMessageChange = (value: string) => {
    setValue('message', value);
    if (value.trim() && category) {
      // Debounce the analysis
      const timeoutId = setTimeout(() => {
        analyzeMessage(value, category);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
      setValue('selectedContacts', []);
    } else {
      const allIds = contacts.map(contact => contact._id);
      setSelectedContacts(allIds);
      setValue('selectedContacts', allIds);
    }
  };

  const handleSelectContact = (contactId: string) => {
    const newSelected = selectedContacts.includes(contactId)
      ? selectedContacts.filter(id => id !== contactId)
      : [...selectedContacts, contactId];
    
    setSelectedContacts(newSelected);
    setValue('selectedContacts', newSelected);
  };

  const onSubmit = async (data: BulkMessageFormData) => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your WhatsApp account first');
      return;
    }

    setIsSending(true);
    try {
      const response = await messagesApi.sendBulkMessage({
        message: data.message,
        category: data.category,
        selectedContacts: data.selectedContacts,
      });

      if (response.success && response.data) {
        toast.success(`Bulk message started for ${response.data.totalContacts} contacts`);
        setBulkMessageId(response.data.bulkMessageId);
        setIsProcessing(true);
        // Start polling for status updates
        startStatusPolling(response.data.bulkMessageId);
        // Reset form
        setValue('message', '');
        setValue('selectedContacts', []);
        setSelectedContacts([]);
        setAnalysis(null);
        setShowAnalysis(false);
      }
    } catch (error) {
      console.error('Error sending bulk message:', error);
      toast.error('Failed to send bulk message');
    } finally {
      setIsSending(false);
    }
  };

  const categories: { value: MessageCategory; label: string }[] = [
    { value: 'promotional', label: 'Promotional' },
    { value: 'notification', label: 'Notification' },
    { value: 'advertising', label: 'Advertising' },
    { value: 'discount_offer', label: 'Discount Offer' },
    { value: 'information', label: 'Information' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <DashboardLayout 
      title="Bulk Messages" 
      subtitle="Send AI-optimized messages to multiple contacts"
    >
      <div className="space-y-6">
        {/* WhatsApp Connection Alert */}
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  WhatsApp Not Connected
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>You need to connect your WhatsApp account before sending messages.</p>
                  <p className="mt-1">
                    <a 
                      href="/whatsapp" 
                      className="text-yellow-800 hover:text-yellow-900 underline"
                    >
                      Go to WhatsApp Settings →
                    </a>
                  </p>
                </div>
                <div className="mt-4">
                  <button 
                    onClick={async () => {
                      try {
                        console.log('Connect WhatsApp button clicked');
                        const result = await connect();
                        console.log('Connect result:', result);
                        if (result.success) {
                          toast.success('WhatsApp connection initiated! Please check the WhatsApp settings page for QR code.');
                        } else {
                          toast.error(result.message || 'Failed to connect WhatsApp');
                        }
                      } catch (error) {
                        console.error('Connect WhatsApp error:', error);
                        toast.error('Failed to connect WhatsApp');
                      }
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Connect WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Form */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">
                  Compose Message
                </h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Category
                    </label>
                    <select
                      {...register('category', { required: 'Category is required' })}
                      className="input"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                    )}
                  </div>

                  {/* Message Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Content
                    </label>
                    <textarea
                      {...register('message', {
                        required: 'Message is required',
                        maxLength: {
                          value: 4096,
                          message: 'Message cannot exceed 4096 characters',
                        },
                      })}
                      rows={6}
                      className={`input ${errors.message ? 'input-error' : ''}`}
                      placeholder="Type your message here..."
                      onChange={(e) => handleMessageChange(e.target.value)}
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {message.length}/4096 characters
                    </p>
                  </div>

                  {/* AI Analysis Button */}
                  {message && (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => analyzeMessage(message, category)}
                        disabled={isAnalyzing}
                        className="btn btn-secondary btn-sm"
                      >
                        {isAnalyzing ? (
                          <>
                            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-4 w-4 mr-2" />
                            Analyze with AI
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSending || selectedContacts.length === 0 || !isConnected}
                    className="btn btn-primary w-full"
                  >
                    {isSending ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                        Sending Messages...
                      </>
                    ) : (
                      <>
                        <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                        Send to {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

        {/* Settings Info */}
        {settings && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Current Settings
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Message Delay:</span>
                  <span className="ml-2 font-medium">{settings.messageDelay || 2}s</span>
                </div>
                <div>
                  <span className="text-gray-500">Max Retries:</span>
                  <span className="ml-2 font-medium">{settings.maxRetries || 3}</span>
                </div>
                <div>
                  <span className="text-gray-500">AI Enabled:</span>
                  <span className="ml-2 font-medium">{settings.aiEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Auto Reconnect:</span>
                  <span className="ml-2 font-medium">{settings.autoReconnect ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && processingStatus && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center">
                <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin mr-2" />
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Processing Bulk Message
                </h3>
              </div>
            </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        processingStatus.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        processingStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {processingStatus.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Contacts:</span>
                        <span className="font-medium">{processingStatus.totalContacts}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Sent:</span>
                        <span className="font-medium text-green-600">{processingStatus.progress?.sent || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Failed:</span>
                        <span className="font-medium text-red-600">{processingStatus.progress?.failed || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Pending:</span>
                        <span className="font-medium text-yellow-600">{processingStatus.progress?.pending || 0}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${processingStatus.totalContacts > 0 ? 
                            ((processingStatus.progress?.sent || 0) / processingStatus.totalContacts) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis Results */}
            {showAnalysis && analysis && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
                    AI Analysis Results
                  </h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {/* Spam Detection */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">Spam Detection:</span>
                        {analysis.isSpam ? (
                          <span className="badge badge-warning">Potential Spam</span>
                        ) : (
                          <span className="badge badge-success">Clean</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Confidence: {(analysis.confidence * 100).toFixed(1)}%
                      </p>
                    </div>

                    {/* Spam Words */}
                    {analysis.spamWords.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Detected Issues:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {analysis.spamWords.map((word, index) => (
                            <span key={index} className="badge badge-warning">
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Replacements */}
                    {analysis.replacements.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Suggested Replacements:</span>
                        <div className="mt-2 space-y-2">
                          {analysis.replacements.map((replacement, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-red-600 line-through">
                                  "{replacement.original}"
                                </span>
                                <span className="text-sm text-gray-500">→</span>
                                <span className="text-sm text-green-600">
                                  "{replacement.replacement}"
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {replacement.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rewritten Message */}
                    <div>
                      <span className="text-sm font-medium text-gray-700">AI-Optimized Message:</span>
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-gray-900">{analysis.rewrittenMessage}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Selection */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Select Contacts
                  </h3>
                  <span className="text-sm text-gray-500">
                    {selectedContacts.length} selected
                  </span>
                </div>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {/* Select All */}
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                    <input
                      type="checkbox"
                      checked={selectedContacts.length === contacts.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select All ({contacts.length} contacts)
                    </span>
                  </div>

                  {/* Contact List */}
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {contacts.map((contact) => (
                      <div
                        key={contact._id}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact._id)}
                          onChange={() => handleSelectContact(contact._id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-500">{contact.phone}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {contacts.length === 0 && (
                    <div className="text-center py-8">
                      <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">No contacts found</p>
                      <button className="btn btn-primary btn-sm mt-2">
                        Add Contacts
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
