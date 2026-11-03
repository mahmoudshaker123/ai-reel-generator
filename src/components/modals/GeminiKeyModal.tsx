'use client';

import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { Sparkles, Key, CheckCircle, AlertCircle, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { apiGemini } from '@/lib/api';

interface GeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GeminiKeyModal({ isOpen, onClose, onSuccess }: GeminiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<{ configured: boolean; masked_key: string; model: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      apiGemini.getStatus().then(res => { setCurrentStatus(res); setErrorMsg(''); setSuccessMsg(''); }).catch(() => {});
    }
  }, [isOpen]);

  async function loadStatus() {
    try {
      const res = await apiGemini.getStatus();
      setCurrentStatus(res);
    } catch {
      // ignore
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      setErrorMsg('يرجى لصق مفتاح Gemini API Key أولاً.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await apiGemini.saveKey(apiKey.trim());
      setSuccessMsg(res.message || 'تم تفعيل Gemini بنجاح!');
      setApiKey('');
      await loadStatus();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل التحقق من مفتاح Gemini.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="إعدادات Gemini" style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '24px 16px', overflowY: 'auto',
    }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{
        width: '100%', maxWidth: 460, margin: 'auto',
        background: '#0D0F18', border: '1px solid rgba(139, 92, 246, 0.35)',
        borderRadius: 18, padding: 22,
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(139, 92, 246, 0.2)',
        position: 'relative', display: 'flex', flexDirection: 'column', gap: 14,
        color: '#F3F4F6', direction: 'rtl', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, left: 16,
            background: 'rgba(255, 255, 255, 0.08)', border: 'none',
            borderRadius: '50%', width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9CA3AF', cursor: 'pointer',
          }}
          title="إغلاق"
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 30 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(139, 92, 246, 0.4)',
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
              ربط Gemini API
            </h3>
            <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              مفتاح من Google AI Studio لتحليل الصوت وتوليد الكابشن
            </p>
          </div>
        </div>

        {/* Current Status Box */}
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: currentStatus?.configured ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${currentStatus?.configured ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {currentStatus?.configured ? (
              <CheckCircle size={18} color="#10B981" />
            ) : (
              <AlertCircle size={18} color="#F59E0B" />
            )}
            <span style={{ fontSize: 12, fontWeight: 700, color: currentStatus?.configured ? '#10B981' : '#F59E0B' }}>
              {currentStatus?.configured ? 'يوجد مفتاح محفوظ على هذا الجهاز' : 'لم يتم ربط المفتاح بعد'}
            </span>
          </div>
          {currentStatus?.configured && (
            <span style={{ fontSize: 11, color: '#A7F3D0', fontFamily: 'monospace', direction: 'ltr' }}>
              {currentStatus.masked_key}
            </span>
          )}
        </div>

        {/* Key Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF' }}>
            {currentStatus?.configured ? 'تغيير أو تحديث المفتاح:' : 'أدخل مفتاح Gemini API Key:'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="password" autoComplete="off"
              placeholder="AQ.Ab8... أو AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 38px',
                borderRadius: 8, background: '#141724',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff', fontSize: 12, outline: 'none',
                fontFamily: 'monospace', direction: 'ltr', textAlign: 'left',
              }}
            />
            <Key size={15} color="#818CF8" style={{ position: 'absolute', left: 12, top: 12 }} />
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div style={{ fontSize: 11, color: '#EF4444', background: 'rgba(239, 68, 68, 0.12)', padding: '8px 10px', borderRadius: 8 }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ fontSize: 11, color: '#10B981', background: 'rgba(16, 185, 129, 0.12)', padding: '8px 10px', borderRadius: 8 }}>
            {successMsg}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ borderRadius: 8, padding: '6px 14px', fontSize: 12 }}
          >
            إغلاق
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !apiKey.trim()}
            style={{
              borderRadius: 8, padding: '7px 20px', fontSize: 12, fontWeight: 700,
              background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
              color: '#fff', border: 'none', cursor: loading || !apiKey.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !apiKey.trim() ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)',
            }}
          >
            {loading ? (
              <>
                <div className="animate-spin" style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                <span>جاري التحقق...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={14} />
                <span>حفظ وتفعيل</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}
