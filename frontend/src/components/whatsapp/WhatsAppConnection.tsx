'use client';

import { useState, useEffect, useRef } from 'react';
import { useWhatsAppStore } from '@/store/whatsappStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface WhatsAppConnectionProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export function WhatsAppConnectionComponent({ onConnectionChange }: WhatsAppConnectionProps) {
  const [qrLoading, setQrLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const {
    status,
    isConnected,
    isLoading,
    qrCode,
    connect,
    disconnect,
    refreshQR,
    fetchStatus
  } = useWhatsAppStore();

  const { settings } = useSettingsStore();

  // Initial status check on component mount (only if no status exists)
  useEffect(() => {
    // Only fetch status if we don't have any status information
    if (!status && !isLoading) {
      fetchStatus();
    }
  }, [fetchStatus, status, isLoading]);

  // Handle connection change callback
  if (onConnectionChange && status) {
    onConnectionChange(status.isConnected);
  }

  // Reduced debug logging - only log important state changes
  const prevConnected = useRef(isConnected);
  useEffect(() => {
    if (isConnected !== prevConnected.current) {
      console.log('WhatsApp Connection Status Changed:', {
        isConnected,
        state: status?.state,
        hasQR: !!qrCode
      });
      prevConnected.current = isConnected;
    }
  }, [isConnected, status?.state, qrCode]);

  // Auto-show QR modal when QR code becomes available (only if not already shown)
  useEffect(() => {
    if (qrCode && !showQR && isLoading) {
      console.log('QR code detected, showing modal');
      setShowQR(true);
      toast.success('QR code ready! Please scan with WhatsApp.');
    }
  }, [qrCode, showQR, isLoading]);

  // Update QR code in UI without forcing modal open
  useEffect(() => {
    if (qrCode && showQR) {
      console.log('QR code updated in UI:', qrCode.substring(0, 50) + '...');
      // Just update the QR code, don't force modal open
    }
  }, [qrCode, showQR]);

  // No periodic status checks needed - WebSocket provides real-time updates
  // Status is only fetched on initial load and when explicitly needed

  // QR code should be provided directly from the connect endpoint
  // No need for polling since the backend now waits for QR generation

  const handleConnect = async () => {
    try {
      const response = await connect();
      console.log('HandleConnect response:', response);
      if (response.success) {
        // Show QR modal immediately when connecting
        setShowQR(true);
        if (response.qr) {
          toast.success('QR code ready! Please scan with WhatsApp.');
        } else {
          toast.success('Generating QR code... Please wait.');
        }
      } else {
        toast.error(response.message || 'Failed to connect WhatsApp');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please try again.');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('Connection failed. Please try again.');
      }
    }
  };

  const handleDisconnect = async () => {
    const response = await disconnect();
    if (response.success) {
      toast.success('WhatsApp disconnected successfully');
      setShowQR(false);
    } else {
      toast.error(response.message || 'Failed to disconnect WhatsApp');
    }
  };

  const handleRefreshQR = async () => {
    setQrLoading(true);
    try {
      const response = await refreshQR();
      if (response.success && response.qr) {
        setShowQR(true);
        toast.success('QR code refreshed!');
      } else {
        toast.error('QR code not available. Please try connecting again.');
      }
    } catch (error: any) {
      console.error('Refresh QR error:', error);
      if (error.response?.status === 400) {
        toast.error('No active connection. Please click "Connect WhatsApp" first.');
      } else {
        toast.error('Failed to get QR code. Please try connecting again.');
      }
    } finally {
      setQrLoading(false);
    }
  };

  const handleCloseQR = () => {
    console.log('QR modal closed by user');
    setShowQR(false);
    // Don't show toast when user closes the modal
  };

  const closeQR = () => {
    handleCloseQR();
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          WhatsApp Connection Status
        </h3>
      </div>
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
            <span className="text-sm font-medium text-gray-900">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {status?.state && (
              <span className="text-xs text-gray-500 capitalize">
                ({status.state.replace('_', ' ')})
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="btn btn-primary btn-sm"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect WhatsApp'
                )}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="btn btn-secondary btn-sm"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </button>
            )}
          </div>
        </div>

        {!isConnected && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  WhatsApp Not Connected
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>You need to connect your WhatsApp account to send bulk messages.</p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={handleRefreshQR}
                    disabled={qrLoading}
                    className="text-sm text-yellow-800 hover:text-yellow-900 underline"
                  >
                    {qrLoading ? 'Loading...' : 'Refresh QR Code'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  WhatsApp Connected
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your WhatsApp account is connected and ready to send messages.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQR && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={closeQR} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Scan QR Code
                    </h3>
                    <button
                      onClick={closeQR}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="text-center">
                    {qrCode ? (
                      <div className="mb-4">
                        <img
                          src={qrCode}
                          alt="WhatsApp QR Code"
                          className="mx-auto border border-green-500 rounded-lg shadow-lg"
                          style={{ maxWidth: '250px', height: 'auto' }}
                          onLoad={() => console.log('QR code image loaded successfully')}
                          onError={() => console.error('QR code image failed to load')}
                        />
                        <p className="text-xs text-green-600 mt-2 text-center">
                          QR code ready! Scan with your phone.
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <QrCodeIcon className="h-16 w-16 text-gray-400 mx-auto animate-pulse" />
                        <div className="flex justify-center mt-2">
                          <div className="loading-spinner loading-sm"></div>
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 mb-4">
                      Go to Settings {'->'} Linked Devices {'->'} Link a Device {'->'} Scan QR Code.
                    </p>
                    {!qrCode && (
                      <div className="bg-gray-100 p-4 rounded-lg">
                        <p className="text-xs text-gray-500">
                          QR code will appear here once generated. Please wait...
                        </p>
                      </div>
                    )}
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={handleRefreshQR}
                        disabled={qrLoading}
                        className="btn btn-secondary btn-sm flex-1"
                      >
                        {qrLoading ? (
                          <>
                            <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          'Refresh QR'
                        )}
                      </button>
                      <button
                        onClick={closeQR}
                        className="btn btn-primary btn-sm flex-1"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
